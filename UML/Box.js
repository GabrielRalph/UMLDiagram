import {Vector} from "../4.js"
let BoxHASH = 0;
let BoxHASHTable = {};


function clearBoxHASH(){
  BoxHASHTable = {};
  BoxHASH = 0;
}

function addBoxHASH(id){
  let h = null
  if (id == null){
    h ="BOX" + BoxHASH;
    BoxHASH++;
  }else if (id in BoxHASHTable) {
    throw "err";
  }else {
    let num = parseInt(id.replace("BOX", ""));
    if (num + 1 > BoxHASH)  BoxHASH = num + 1;
    h = id;
  }
  BoxHASHTable[h] = true;
  return h;
}

class Box {
  _hashid;
  constructor(id = null){
    this.height = 0;
    this.width = 0;
    this.pos = 0;
    this.radius = 0;
    this._hashid = addBoxHASH(id)
  }

  toString(){
    return this._hashid
  }

  pointOnRegion(r) {
    let corners = this.regionCornersAbsolute;
    if (corners == null || r == null || r.index == null) return;
    let n = corners.length;
    let i = r.index;
    let f = r.fraction;
    let j = (i + n - 1) % n;
    let point = null;
    let norm = null;
    let p2 = corners[i];
    let p1 = corners[j];

    if (i % 2 == 0) {
      point = p1.mul(f).add(p2.mul(1 - f));
      norm = p2.sub(p1).rotate(-Math.PI/2).dir();
    } else {
      let center = p1.clone();
      if (((i - 1)/2) % 2 == 0) {
        center.x = p2.x;
      }else {
        center.y = p2.y;
      }
      let rad = p1.sub(center);
      norm = rad.rotate(f * Math.PI/2);
      point = center.add(norm);
      norm = norm.dir();
    }

    r["point"] = point;
    r["norm"] = norm;
  }
  findRegion(box) {
    let w = this.width / 2;
    let h = this.height / 2;
    let r = this.radius;

    let bw = box.width / 2;
    let bh = box.height / 2;
    let br = box.radius;
    // let bcorners = box.regionCornersAbsolute;
    let bpos = box.pos.clone();
    let pos = this.pos.clone();

    let region = {
      index: null,
      order: bpos.sub(pos).arg(),
      box: box,
    }

    let delta = bpos.sub(pos);
    let ow = w + bw - (r + br)/2;
    let oh = h + bh - (r + br)/2;

    if (delta.x > ow && delta.y > oh) {
      region.index = 1;
    }
    if (delta.x < -ow && delta.y > oh) {
      region.index = 3;
    }
    if (delta.x < -ow && delta.y < -oh) {
      region.index = 5;
    }
    if (delta.x > ow && delta.y < -oh) {
      region.index = 7;
      region.order = delta.x/(-1*delta.y)
    }

    if (delta.x <= ow && delta.x >= -ow) {
      if (delta.y > oh) {
        region.index = 2;
        region.order = 2*ow + delta.x;
      } else if (delta.y < -oh){
        region.index = 6;
        region.order = 2*ow - delta.x;
      }
    }


    if (delta.y <= oh && delta.y >= -oh) {
      if (delta.x > ow) {
        region.index = 0;
        region.order = 2*oh - delta.y;
      } else if (delta.x < -ow){
        region.index = 4;
        region.order = 2*oh + delta.y;
      }
    }


    return region;
  }
  findRegions(boxes) {
    // find the boxes in each region
    let regions = {};
    for (let box of boxes) {
      let r = this.findRegion(box);
      if (r.index != null) {
        if (!(r.index in regions)) regions[r.index] = [];
        regions[r.index].push(r)
      }
    }

    // order boxes in each region
    for (let rid in regions) {
      let region_boxes = regions[rid];
      region_boxes.sort((a, b) => a.order > b.order ? 1 : -1);

      let rn = region_boxes.length;
      for (let i = 0; i < rn; i++) {
        let rfrac = (i + 1) / (rn + 1);
        region_boxes[i].fraction = rfrac;
        this.pointOnRegion(region_boxes[i]);
      }
    }

    return regions;
  }
  getBoxAnchors(boxes) {
    let anchors = {};
    let regions = this.findRegions(boxes);
    for (let rid in regions) {
      for (let region of regions[rid]) {
        anchors[region.box] = {point: region.point, norm: region.norm};
      }
    }
    return anchors
  }

  get regionCorners(){
    let h = this.height / 2;
    let w = this.width / 2;
    let r = this.radius;

    if (h <= 0 || w <= 0 || r >= w || r >= h) {
      return null;
    } else {
      return [
        new Vector(w, h - r),
        new Vector(w - r, h),
        new Vector(r - w, h),
        new Vector(-w, h - r),
        new Vector(-w, r - h),
        new Vector(r-w, -h),
        new Vector(w - r, -h),
        new Vector(w, r-h)
      ];
    }
  }
  get regionCornersAbsolute(){
    let corners = this.regionCorners;
    if (corners != null) {
      for (let i = 0; i < corners.length; i++) {
        corners[i] = corners[i].add(this.pos);
      }
    }
    return corners;
  }
}

export {Box, clearBoxHASH}
