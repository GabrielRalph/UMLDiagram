import {SvgPlus, Vector} from "../4.js"
import {VBox, VEdges, VControls, VBoxBorder, searchUp, clearBoxHASH} from "./VBox.js"

let debug = new SvgPlus("debug");
debug.innerHTML = "script"

let jsonToHtml = (json, object) => {
  for (let key in json) {
    let kv = object.createChild("div", {style: {
      display: "flex",
      "justify-content": "space-between",
    }});
    kv.createChild("h5", {content: key});
    let value = json[key];
    if (typeof value === "object") {
      // jsonToHtml(value, kv.createChild("div"))
    }else {
      kv.createChild("h5", {content: value+""})
    }
  }
}
debug.json = (json) => {
  debug.innerHTML = ""
  jsonToHtml(json, debug)
}

let umlData = {
  "CAnimal":{
    methods: [
      "Walk() : void",
    ],
  },
  "CPerson": {
    methods: [
      "Feed(CPet pet) : void",
      "WritePoetry() : void"
    ],
    _variables: [
      "feeds: list<CPet>",
    ],
  },
  "CPet": {
    methods: [
      "Feed() : void",
    ],
  },
  "CDog": {
    methods: [
      "EatHomework() : void",
    ],
  },
  "CCat": {
    methods: [
      "DoSomething() : void",
    ],
  }
}

function umlJSONToString(umlClass, name){
  if ("methods" in umlClass) {
    for(let prop of umlClass.methods) {
      name += "\n + " + prop;
    }
  }
  if ("_methods" in umlClass) {
    for(let prop of umlClass._methods) {
      name += "\n - " + prop;
    }
  }
  name += "\n";
  if ("variables" in umlClass) {
    for(let prop of umlClass.variables) {
      name += "\n - " + prop;
    }
  }
  if ("_variables" in umlClass) {
    for(let prop of umlClass._variables) {
      name += "\n - " + prop;
    }
  }
  return name;
}
let atypes = [
  "association",
  "inheritance",
  "realisation",
  "dependancy",
  "aggrigation",
  "composition"
]

async function parseJS(code){
  let data = await fetch(code);
  let text = await data.text();
  let matches = text.matchAll(/class\s+(\w+)(\s+extends\s+(\w+))?\s+{/g);
  let json = {};
  for (let match of matches) {
    json[match[1]] = {};
    console.log(match[1]);
    console.log(match[1], match[3]);
  }
  return json
}

// (async function (){
//   let json = await parseJS("https://3d.svg.plus/svg-3d.js")
//   let el = document.getElementById("uml-diagram");
//   el.clear();
//   el.addUmlJSON(json)
// })();

class UMLDiagram extends SvgPlus {
  constructor(el = "svg") {
    super(el);
    clearBoxHASH();
    let edges = this.getElementsByClassName("v-edges")[0];
    let boxes = this.getElementsByClassName("v-boxes")[0];

    if (!boxes) {
      boxes = this.createChild("g", {class: "v-boxes"});
    } else if (SvgPlus.is(boxes, SvgPlus)) {
      boxes = new SvgPlus(boxes);
    }

    if (!edges) {
      edges = this.createChild(VEdges);
    } else if (!SvgPlus.is(edges, VEdges)) {
      edges = new VEdges(edges);
    }
    edges.onedge = (e) => {this.onedge(e)};
    this.controls = new VControls(edges, this);

    this.boxes = boxes;
    this.edges = edges;
    this.loadBoxes(boxes);
    this.edges.loadEdges();
  }

  loadBoxes(boxes){
    for (let box of boxes.children) {
      if (!SvgPlus.is(box, VUmlBox)) {
        let vbox = new VUmlBox(box);
        vbox.onchange = () => {this.edges.update();}
        this.edges.add_box_ref(vbox.box+"", vbox.box)
      }
    }
  }

  saveSvg(name = "UML Diagram"){
    for (let vbox of this.boxes.children) {
      if (SvgPlus.is(vbox, VBox)) {
        vbox.applyAttributes();
      }
    }
    let vb = this.getAttribute("viewBox");
    this.crop();
    this.props = {
      xmlns: "http://www.w3.org/2000/svg"
    }
    super.saveSvg(name);
    this.props = {viewBox: vb}
  }
  async openSvg(){
    let input = new SvgPlus("input");
    input.props = {
      type: "file"
    }
    input.click();
    return new Promise((resolve, reject) => {
      input.onchange = () => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try{
            let svg = SvgPlus.parseSVGString(evt.target.result);
            resolve(evt.target.result)
          } catch(e) {
            console.log(e);
            resolve(null)
          }
        };
        reader.readAsText(input.files[0]);
      }
    });
  }

  async openSvgTo(to){
    let uml = await this.openSvg();
    if (uml != null) {
      to.innerHTML = uml;
      try{
        let nel = new UMLDiagram(to.children[0]);
        return nel;
      } catch(e) {
        to.innerHTML = "";
        return null
      }
    } else {
      alert("Something went wrong reading the file.")
      return null;
    }
  }

  addUmlJSON(data){
    for (let name in data) {
      this.addUmlBox(umlJSONToString(data[name], name))
    }
  }

  async loadFromJS(url) {
    this.addUmlJSON(await parseJS(url));
  }

  clear(){
    this.edges.clear();
    this.boxes.innerHTML = "";
    clearBoxHASH();
  }

  crop(padding = 50){
    let bbox = this.getBBox();
    let o = new Vector(bbox);
    let size = new Vector(bbox.width, bbox.height);
    let px = padding;
    let ar = 24/21;
    if (size.y / size.x > ar) {
      px = (size.y / ar - size.x)/2;
    }
    let pad = new Vector(px, padding);
    o = o.sub(pad);
    size = size.add(pad.mul(2));
    this.props = {
      viewBox: `${o.x} ${o.y} ${size.x} ${size.y}`
    }
  }

  get center(){
    let vb = this.getAttribute("viewBox").split(" ");
    let ssize = new Vector(window.innerWidth, window.innerHeight);
    let vsize = new Vector(vb, 2);
    let vpoint = ssize.div(2).mul(vsize.x / ssize.x);
    return vpoint;
  }

  addUmlBox(string) {
    this.boxes.appendChild(new VUmlBox(string, this.center))
  }

  removeUmlBox(umlBox) {
    this.edges.remove_box(umlBox.box);
    let parent = umlBox.parentNode;
    if (parent != null) {
      parent.removeChild(umlBox);
    }
  }

  onedge(edge) {
    let i = 0;
    edge.arrow_length = 7;
    edge.control1.onclick = () => {
      let c = edge.path.class;
      if (c.indexOf(" start-marker") == -1) {
        edge.path.class += " start-marker"
      }else {
        edge.path.class = c.replace(" start-marker", "")
      }
    }
    edge.control2.onclick = () => {
      let c = edge.path.class;
      if (c.indexOf(" end-marker") == -1) {
        edge.path.class += " end-marker"
      }else {
        edge.path.class = c.replace(" end-marker", "")
      }
    }

    edge.control3.onclick = () => {
      i = (i + 1) % atypes.length;
      let atype = atypes[i];
      edge.class = "v-edge " + atype;
      if (atype == atypes[4] || atype == atypes[5]) {
        edge.arrow_length = 14;
      }else {
        edge.arrow_length = 7;
      }
    }
  }
}

class VUmlBox extends VBox {
  constructor(string, center){
    if (string instanceof SVGGElement) {
      super(string)
    }else {
      super("g");
    }

    if (this.children.length > 0) {
      if (this.children.length > 1) {
        this.text = this.children[1];
        let value = ""
        for (let te of this.text.children) {
          value += te.innerHTML + "\n"
        }
        value = value.replace(/[\s]*$/, "")
        value = value.replace(/&gt;/g, ">").replace(/&lt;/g, "<");
        console.log(value);
      }
    } else {
      this.innerHTML = '<rect></rect>';
    }

    new VBoxBorder(this.children[0]);
    if (typeof string === "string") {
      this.make(string);
      this.pos = center;
    }
  }

  async make(string, padding = 30){
    if (this.text) {
      if (this.contains(this.text)) {
        this.removeChild(this.text);
      }
    }
    this.value = string;
    let text = this.createChild(TextLines);
    await text.makeLines(string);
    this.width = text.width + padding*2;
    this.height = text.height + padding*2;
    this.radius = padding;
    this.text = text;
  }
}

class TextLines extends SvgPlus {
  constructor(el = "g") {
    super(el);
  }

  async updateSize(){
    return new Promise((resolve, reject) => {
      window.requestAnimationFrame(() => {
        let bbox = this.getBBox();
        this.width = bbox.width;
        this.height = bbox.height;
        this.props = {
          transform: `translate(${-bbox.width/2 - bbox.x}, ${-bbox.height/2 - bbox.y})`
        }
        resolve();
      })
    });
  }

  async makeLines(string, title = true){
    this.innerHTML = ""
    string = string.replace(/</g, "&lt;");
    string = string.replace(/>/g, "&gt;");
    let lines = string.split("\n");
    let n = lines.length;
    for (let i = 0; i < n; i++) {
      let style = {};
      if (i == 0 && title) {
        style["font-size"] = "2em";
      }
      this.createChild("text", {
        "text-anchor": "start",
        y: i*1.7 + "em",
        content: lines[i],
        style: style
      })
    }
    await this.updateSize();
  }
}

class ContextMenu extends SvgPlus {
  _fadeWaiter = null;
  constructor(el){
    super(el);
    this.styles = {
      display: "none"
    }
    document.body.addEventListener("contextmenu", (e) => {
      debug.innerHTML = "context"
      let vbox = searchUp(e.target, VBox);
      if (vbox != null) {
        e.preventDefault();
        this.show(vbox, e);
      }
    })
  }


  onmousemove(){
    this.startFader();
  }

  startFader(){
    if (this._fadeWaiter != null) {
      clearTimeout(this._fadeWaiter);
    }
    this._fadeWaiter = setTimeout(() => {
      if (this._fadeWaiter != null) {
        this.hide();
      }
    }, 1000);
  }

  clearFader(){
    clearTimeout(this._fadeWaiter);
    this._fadeWaiter = null;
  }

  hide(){
    this._fadeWaiter = null;
    this.selected = null;
    this.styles = {
      display: "none"
    }
  }

  show(vbox, loc){
    this.selected = vbox;
    this.styles = {
      left: loc.x + 'px',
      top: loc.y + 'px',
      display: ""
    }
    this.startFader();
  }
}

export {UMLDiagram, umlData, VBox, ContextMenu}
