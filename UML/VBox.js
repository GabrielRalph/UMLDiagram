import {SvgPlus, Vector} from "../4.js"
import {Box, clearBoxHASH} from "./Box.js"

function searchUp(target, classDef) {
  let res = null;
  while (target != null) {
    if (SvgPlus.is(target, classDef)) {
      res = target;
      break;
    }
    target = target.parentNode;
  }
  return res;
}

class VEdge extends SvgPlus{
  _arrow_length = 6;
  _lastpa;
  _lastpb;
  _boxa;
  _boxb;
  constructor(){
    super("g");
    this.class = "v-edge";
    this.path = this.createChild("path", {class: "edge-path"});
    this.control1 = this.createChild("path", {class: "control"});
    this.control2 = this.createChild("path", {class: "control"});
    this.control3 = this.createChild("path", {class: "control"});
  }

  set boxa(box){
    this._boxa = box;
    this.setAttribute("box-a", ""+ box)
  }
  get boxa(){
    return this._boxa;
  }

  set boxb(box){
    this._boxb = box;
    this.setAttribute("box-b", ""+ box)
  }
  get boxb(){
    return this._boxb;
  }

  set arrow_length(value){
    if (typeof value === "string") value = parseFloat(value);
    if (Number.isNaN(value)) value = 0;
    if (typeof value === "number") {
      this._arrow_length = value;
      this.update();
    }
  }
  get arrow_length(){
    return this._arrow_length;
  }

  update(pa = this._lastpa, pb = this._lastpb) {
    this._lastpa = pa;
    this._lastpb = pb;
    let arrow_length = this.arrow_length;
    if (pa && pb) {
      let anorm = pa.norm;
      let bnorm = pb.norm;
      pa = pa.point;
      pb = pb.point;
      let dist = pa.dist(pb);

      let p1 = pa.add(anorm.mul(arrow_length));
      let p2 = pb.add(bnorm.mul(arrow_length));
      let c1 = p1.add(anorm.mul(dist/3));
      let c2 = p2.add(bnorm.mul(dist/3));
      this.path.props = {
        d: `M${pa}L${p1}C${c1},${c2},${p2}L${pb}`
      }
      this.control1.props = {
        d: `M${pa}L${pa}`
      }
      this.control2.props = {
        d: `M${pb}L${pb}`
      }
      let v = new Vector(this.path.getPointAtLength(this.path.getTotalLength()/2));
      this.control3.props = {
        d: `M${v}L${v}`
      }
      this.styles= {display: ''}
    }else {
      this.styles = {display: "none"}
    }
  }
}

class VEdges extends SvgPlus{
  _edges;
  _neighbors = {}
  _lookup = {}
  constructor(el = "g"){
    super(el);
    this.class = "v-edges"
  }

  loadEdges(){
    let edges = [];
    for (let edge of this.children) {
      let a = edge.getAttribute("box-a");
      let b = edge.getAttribute("box-b");
      let cname = edge.getAttribute("class");
      let path = edge.children[0];
      if (path) path = path.getAttribute("class");
      if (cname.indexOf("v-edge") == -1) cname = "v-edge " + cname;

      if (a && b) {
        edges.push({
          a: a,
          b: b,
          class: cname,
          pathClass: path,
        })
      }
    }
    this.innerHTML = ""
    for (let edge of edges) {
      let edgeEl = this.add_edge(edge.a, edge.b);
      edgeEl.class = edge.class;
      edgeEl.path.class = edge.pathClass;
    }
  }

  clear(){
    this._neighbors = {};
    this._lookup = {};
    this.innerHTML = "";
  }

  add_box_ref(id, box) {
    this._lookup[id] = box;
  }

  remove_box(box) {
    let neighbors = this._neighbors;
    if (box in neighbors) {
      let ns_of_box = neighbors[box];
      let edges = [];
      for (let n_of_box in ns_of_box) edges.push(n_of_box);
      for (let edge of edges) {
        this.remove_edge(box, edge);
      }
    }
  }

  add_edge(a, b){
    let edge = null;
    if (!this.contains_edge(a, b)) {
      edge = this.createChild(VEdge);

      edge.boxa = a;
      edge.boxb = b;

      let neighbors = this._neighbors;
      let lookup = this._lookup;
      if (!(a in neighbors)) neighbors[a] = {};
      if (!(b in neighbors)) neighbors[b] = {};
      if (a instanceof Box) lookup[a] = a;
      if (b instanceof Box) lookup[b] = b;
      neighbors[a][b] = edge;
      neighbors[b][a] = edge;
      this.update();
    }
    if (edge != null && this.onedge instanceof Function) {
      this.onedge(edge);
    }
    return edge;
  }

  remove_edge(a, b) {
    if (this.contains_edge(a, b)) {
      let neighbors = this._neighbors;

      let edge = neighbors[a][b];
      delete neighbors[a][b];
      delete neighbors[b][a];
      if (Object.keys(neighbors[a]).length == 0) delete neighbors[a];
      if (Object.keys(neighbors[b]).length == 0) delete neighbors[b];
      this.removeChild(edge);
      this.update();
    }
  }

  contains_edge(a, b) {
    let neighbors = this._neighbors;
    return a in neighbors && b in neighbors[a];
  }

  get edge_anchors(){
    let neighbors = this._neighbors;
    let lookup = this._lookup;

    let anchors = {};
    for (let boxid in neighbors) {
      let boxa = lookup[boxid];
      let boxes = [];
      for (let nid in neighbors[boxid]) {
        boxes.push(lookup[nid])
      }
      let ancs = boxa.getBoxAnchors(boxes);
      anchors[boxid] = ancs;
    }
    return anchors;
  }

  update() {
    let anchors = this.edge_anchors

    for (let edge of this.getElementsByClassName("v-edge")) {
      let a = edge.boxa;
      let b = edge.boxb;
      let v1 = anchors[a][b];
      let v2 = anchors[b][a];
      edge.update(v1, v2);
    }
  }
}

class VControls {
  _lastVBox = null;
  _waiting = null;

  constructor(edges, viewBox){
    this.edges = edges;
    this.viewBox = viewBox;
    let ecbs = ["dblclick","mousedown","mouseup","mouseleave","mousemove"];
    for (let ecb of ecbs) viewBox.addEventListener(ecb, (e) => {
      this["on" + ecb](e);
    });
  }

  addEdge(boxa, boxb) {
    let edge = null;
    if (SvgPlus.is(boxa, VBox) && SvgPlus.is(boxb, VBox)) {
      if (this.edges.contains_edge(boxa.box, boxb.box)) {
        this.edges.remove_edge(boxa.box, boxb.box);
      }else {
        edge = this.edges.add_edge(boxa.box, boxb.box);
        boxa.addEventListener("change", () => {this.edges.update()})
        boxb.addEventListener("change", () => {this.edges.update()})
      }
    }
    if (edge != null && this.onedge instanceof Function) {
      this.onedge(edge);
    }
  }

  set lastVBox(vbox){
    let lastVBox = this.lastVBox;

    if (vbox == lastVBox && vbox != null) return;
    if(lastVBox != null) {
      lastVBox.class = this.lastVBox.class.replace(" selected", "")

      if (SvgPlus.is(vbox, VBox)) {
        clearTimeout(this._waiting);
        this._waiting = null;
        this.addEdge(lastVBox, vbox);
      }
      this._lastVBox = null;
    } else {
      if (SvgPlus.is(vbox, VBox) && this._waiting == null) {
        vbox.class += " selected"
        this._lastVBox = vbox;
        this._waiting = setTimeout(() => {
          this._waiting = null;
          this.lastVBox = null;
        }, 2000)
      }
    }
  }
  get lastVBox(){
    return this._lastVBox;
  }

  ondblclick(e) {
    let vbox = searchUp(e.target, VBox);
    if (vbox != null) {
      this.lastVBox = vbox;
    }
  }
  onmousedown(e) {
    let vbox = searchUp(e.target, VBox);
    if (vbox != null) {
      this.selected = vbox;

      let v = new Vector(e);
      this.selectedOffset = this.toSvgPoint(v).sub(vbox.pos);

      if (this.lastVBox != null) {
        this.lastVBox = vbox;
      }
    }
  }
  onmouseup(){
    this.selected = null;

  }
  onmouseleave(){
    this.selected = null;

  }
  onmousemove(e) {
    if (e.buttons == 1 && this.selected != null) {
      let svg = this.viewBox;
      let dv = new Vector(e.x, e.y);
      let dp = this.toSvgPoint(dv);
      this.selected.pos = dp.sub(this.selectedOffset);
    }
  }

  toSvgPoint(v, delta) {
    return VControls.screenToSvgPoint(v, this.viewBox, delta);
  }
  static screenToSvgPoint(v, svg, delta = false){
    let viewBox = svg.getAttribute("viewBox").split(" ");
    let svgoffset = new Vector(viewBox, 0);
    let svgsize = new Vector(viewBox, 2);

    let svgscreenrect = svg.getBoundingClientRect();
    let screenoffset = new Vector(svgscreenrect);
    let screensize = new Vector(svgscreenrect.width, svgscreenrect.height);

    let res = v;
    if (!delta) {
      res = res.sub(screenoffset);
    }
    res = res.div(screensize).mul(svgsize);
    if (!delta) {
      res = res.add(svgoffset)
    }
    return res;
  }
}

class VBox extends SvgPlus {
  _pos = new Vector;
  _width = 0;
  _height = 0;
  _radius = 0;
  _box = null;
  constructor(el = "g"){
    super(el);
    this.class = "v-box";
    let id = this.getAttribute("box-id");
    this._box = new Box(id);
    this.setAttribute("box-id", this.box+"")

    let props = Object.getOwnPropertyDescriptors(VBox.prototype);
    let setters = [];
    for (let propName in props) {
      let prop = props[propName]
      if ("set" in prop && prop.set instanceof Function) {
        setters.push(propName);
        this[propName] = this.getAttribute(propName);
      }
    }

    this.applyAttributes = () => {
      let props = {
        "box-id": ""+this.box
      }
      for (let setter of setters) {
        let value = this[setter];
        if (typeof value == "number") {
          value = Math.round(value*100)/100;
        }
        props[setter] = value;
      }
      this.props = props;
    }

    this.getAllAttributes = () => {
      for (let setter of setters) {
        let value = this.getAttribute(setter);
        if (setter == "pos" && value != null) {
          value = new Vector(value.split(","));
        }
        this[setter] = value;
      }
    }
    this.getAllAttributes();
    // console.log(this.pos);
  }

  get box(){
    return this._box;
  }

  // onmutation(m){
  //   for (let record of m) {
  //     let name = record.attributeName
  //     this[name] = this.getAttribute(name);
  //   }
  // }

  runUpdate(){
    let pos = this.pos;
    this.props = {
      transform: `translate(${pos})`
    }
    this.box.pos = pos;
    this.box.height = this.height;
    this.box.width = this.width;
    this.box.radius = this.radius;

    let event = new Event('change');
    this.dispatchEvent(event);
  }

  get boxName(){
    return ""+this.box;
  }

  set pos(v){
    if (v instanceof Vector) {
      this._pos = v;
      this.runUpdate();
    } else {
       this._pos = new Vector;
    }
  }
  get pos(){
    return this._pos.clone();
  }

  set height(h){
    if (typeof h === "string") {
      h = parseFloat(h);
    }
    if (typeof h === "number" && !Number.isNaN(h)) {
      this._height = h;
    } else {
      this._height = 0;
    }
    this.runUpdate();
  }
  get height(){
    return this._height;
  }

  set radius(r){
    if (typeof r === "string") {
      r = parseFloat(r);
    }
    if (typeof r === "number" && !Number.isNaN(r)) {
      this._radius = r;
    } else {
      this._radius = 0;
    }
    this.runUpdate()
  }
  get radius(){
    return this._radius;
  }

  set width(w){
    if (typeof w === "string") {
      w = parseFloat(w);
    }
    if (typeof w === "number" && !Number.isNaN(w)) {
      this._width = w;
    } else {
      this._width = 0;
    }
    this.runUpdate();
  }
  get width(){
    return this._width;
  }
}

class VBoxBorder extends SvgPlus {
  constructor(el = "rect") {
    super(el);
    this.checkParent();
  }

  checkParent(){
    let vbox = this.parentNode;
    if (SvgPlus.is(vbox, VBox)) {
      this.update(vbox);
      vbox.addEventListener("change", () => {
        this.update(vbox);
      })
    }
  }

  update(vbox){
    this.props = {
      width: vbox.width,
      height: vbox.height,
      rx: vbox.radius,
      x: -vbox.width / 2,
      y: -vbox.height / 2
    }
  }
}


export {VBox, VBoxBorder, VEdges, VControls, searchUp, clearBoxHASH}
