import {SvgPlus, Vector} from "../4.js"
import {Box} from "./Box.js"


class VEdge extends SvgPlus{
  constructor(){
    super("g");
    this.class = "v-edge";
    this.path = this.createChild("path", {class: "edge-path"});
    this.control1 = this.createChild("path", {class: "control"});
    this.control2 = this.createChild("path", {class: "control"});
    this.control3 = this.createChild("path", {class: "control"});
  }

  update(pa, pb) {
    if (pa && pb) {
      let anorm = pa.norm;
      let bnorm = pb.norm;
      pa = pa.point;
      pb = pb.point;
      let dist = pa.dist(pb);
      let c1 = pa.add(anorm.mul(dist/3));
      let c2 = pb.add(bnorm.mul(dist/3));
      this.path.props = {
        d: `M${pa}C${c1},${c2},${pb}`
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

class VBoxes extends SvgPlus{
  #edges;
  #neighbors = {}
  #lookup = {}
  constructor(el = "svg"){
    super(el);
    this.#edges = this.createChild("g");
    this.#edges.class = "v-edges"
  }

  remove_box(box) {
    let neighbors = this.#neighbors;
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
      edge = this.#edges.createChild(VEdge);

      edge.boxa = a;
      edge.boxb = b;

      let neighbors = this.#neighbors;
      let lookup = this.#lookup;
      if (!(a in neighbors)) neighbors[a] = {};
      if (!(b in neighbors)) neighbors[b] = {};
      lookup[a] = a;
      lookup[b] = b;
      neighbors[a][b] = edge;
      neighbors[b][a] = edge;
      this.update();
    }
    return edge;
  }

  remove_edge(a, b) {
    if (this.contains_edge(a, b)) {
      let neighbors = this.#neighbors;

      let edge = neighbors[a][b];
      delete neighbors[a][b];
      delete neighbors[b][a];
      if (Object.keys(neighbors[a]).length == 0) delete neighbors[a];
      if (Object.keys(neighbors[b]).length == 0) delete neighbors[b];
      this.#edges.removeChild(edge);
      this.update();
    }
  }

  contains_edge(a, b) {
    let neighbors = this.#neighbors;
    return a in neighbors && b in neighbors[a];
  }

  get anchors(){
    let neighbors = this.#neighbors;
    let lookup = this.#lookup;

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
    let anchors = this.anchors

    for (let edge of this.#edges.getElementsByClassName("v-edge")) {
      let a = edge.boxa;
      let b = edge.boxb;
      let v1 = anchors[a][b];
      let v2 = anchors[b][a];
      edge.update(v1, v2);
    }
  }
}

class VBoxesEditable extends VBoxes{
  #lastVBox = null;
  #waiting = null;
  constructor(el = "svg"){
    super(el);
  }

  addEdge(boxa, boxb) {
    if (SvgPlus.is(boxa, VBox) && SvgPlus.is(boxb, VBox)) {
      if (this.contains_edge(boxa.box, boxb.box)) {
        this.remove_edge(boxa.box, boxb.box);
      }else {
        this.add_edge(boxa.box, boxb.box);
      }
      boxa.addEventListener("change", () => {this.update()})
      boxb.addEventListener("change", () => {this.update()})
    }
  }

  set lastVBox(vbox){
    let lastVBox = this.lastVBox;

    if (vbox == lastVBox && vbox != null) return;
    if(lastVBox != null) {
      lastVBox.class = this.lastVBox.class.replace(" selected", "")

      if (SvgPlus.is(vbox, VBox)) {
        clearTimeout(this.#waiting);
        this.#waiting = null;
        this.addEdge(lastVBox, vbox);
      }
      this.#lastVBox = null;
    } else {
      if (SvgPlus.is(vbox, VBox) && this.#waiting == null) {
        vbox.class += " selected"
        this.#lastVBox = vbox;
        this.#waiting = setTimeout(() => {
          this.#waiting = null;
          this.lastVBox = null;
        }, 2000)
      }
    }
  }
  get lastVBox(){
    return this.#lastVBox;
  }

  ondblclick(e) {
    let vbox = null;
    for (let el of e.path) {
      if (SvgPlus.is(el, VBox)) {
        this.lastVBox = el;
      }
    }
  }
  onmousedown(e) {
    for (let el of e.path) {
      if (SvgPlus.is(el, VBox)) {
        this.selected = el;
        if (this.lastVBox != null) {
          this.lastVBox = el;
        }
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
      let movement = new Vector(e.movementX, e.movementY);
      let size = new Vector();
      let cbox = this.getBoundingClientRect();
      let vbsize = new Vector(this.getAttribute("viewBox").split(" "), 2);
      let cbsize = new Vector(cbox.width, cbox.height);
      movement = movement.mul(vbsize).div(cbsize);
      let pos = this.selected.pos.add(movement);
      this.selected.pos = pos;
    }
  }
}

class VBox extends SvgPlus {
  #pos = new Vector;
  #width = 0;
  #height = 0;
  #radius = 0;
  box = null;
  constructor(el = "g"){
    super(el);
    this.class = "v-box";
    this.box = new Box;

    let props = Object.getOwnPropertyDescriptors(VBox.prototype);
    let setters = [];
    for (let propName in props) {
      let prop = props[propName]
      if ("set" in prop && prop.set instanceof Function) {
        setters.push(propName);
        this[propName] = this.getAttribute(propName);
      }
    }
    this.watch({
      attributeFilter: setters,
      attributes: true,
    })
  }

  onmutation(m){
    for (let record of m) {
      let name = record.attributeName
      this[name] = this.getAttribute(name);
    }
  }

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
      this.#pos = v;
      this.runUpdate();
    } else {
       this.#pos = new Vector;
    }
  }
  get pos(){
    return this.#pos.clone();
  }

  set height(h){
    if (typeof h === "string") {
      h = parseFloat(h);
    }
    if (typeof h === "number" && !Number.isNaN(h)) {
      this.#height = h;
    } else {
      this.#height = 0;
    }
    this.runUpdate();
  }
  get height(){
    return this.#height;
  }

  set radius(r){
    if (typeof r === "string") {
      r = parseFloat(r);
    }
    if (typeof r === "number" && !Number.isNaN(r)) {
      this.#radius = r;
    } else {
      this.#radius = 0;
    }
    this.runUpdate()
  }
  get radius(){
    return this.#radius;
  }

  set width(w){
    if (typeof w === "string") {
      w = parseFloat(w);
    }
    if (typeof w === "number" && !Number.isNaN(w)) {
      this.#width = w;
    } else {
      this.#width = 0;
    }
    this.runUpdate();
  }
  get width(){
    return this.#width;
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

export {VBox, VBoxBorder, VBoxes, VBoxesEditable}
