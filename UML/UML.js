import {SvgPlus, Vector} from "../4.js"
import {VBox, VBoxesEditable, VBoxBorder, searchUp} from "./VBox.js"

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

class UMLDiagram extends VBoxesEditable {
  addUmlJSON(data){
    this.boxes = this.createChild("g");
    this.prepend(this.boxes);
    for (let name in data) {
      this.addUmlBox(umlJSONToString(data[name], name))
    }
  }

  crop(padding = 25){
    let bbox = this.getBBox();
    let o = new Vector(bbox);
    let size = new Vector(bbox.width, bbox.height);
    let px = padding;
    let ar = 240/210;
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
    this.remove_box(umlBox.box);
    let parent = umlBox.parentNode;
    if (parent != null) {
      parent.removeChild(umlBox);
    }
  }

  add_edge(a, b) {
    let edge = super.add_edge(a, b);
    if (edge != null) {
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
    return edge;
  }
}

class VUmlBox extends VBox {
  constructor(string, center){
    super("g");
    this.innerHTML = '<rect></rect>';
    new VBoxBorder(this.children[0]);
    this.make(string);
    this.pos = center;
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
  async makeLines(string, title = true){
    this.innerHTML = ""
    string = string.replace("<", "&lt;");
    string = string.replace(">", "&gt;");
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
}

class ContextMenu extends SvgPlus {
  #fadeWaiter = null;
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
    if (this.#fadeWaiter != null) {
      clearTimeout(this.#fadeWaiter);
    }
    this.#fadeWaiter = setTimeout(() => {
      if (this.#fadeWaiter != null) {
        this.hide();
      }
    }, 1000);
  }

  clearFader(){
    clearTimeout(this.#fadeWaiter);
    this.#fadeWaiter = null;
  }

  hide(){
    this.#fadeWaiter = null;
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
