import * as T from './vendor/three.js';
import { RoundedBoxGeometry } from './vendor/rounded-box.js';

const TAU = Math.PI * 2;
const NOSE = 2.2495;
const WHEELBASE = 2.45;
const WHEELS = [
  { z: -1.28, track: 1.518, width: .305, radius: .3455, rotor: .165 },
  { z: WHEELBASE - 1.28, track: 1.543, width: .245, radius: .33975, rotor: .175 }
];
const vector = (x, y, z) => new T.Vector3(x, y, z);
const paint = (color, roughness, metalness = 0, extra = {}) =>
  new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });

// Longitudinal sections: station, half width, sill, shoulder height, deck height.
const bodySections = [
  [-NOSE,.796,.171,.650,.737],[-2.15,.863,.146,.727,.792],[-1.89,.897,.151,.761,.793],
  [-1.52,.904,.162,.792,.815],[-1.27,.902,.155,.816,.834],[-.96,.882,.149,.806,.829],
  [-.62,.852,.145,.768,.812],[-.20,.835,.147,.735,.792],[.30,.841,.152,.735,.777],
  [.71,.866,.154,.748,.760],[1.16,.893,.152,.781,.738],[1.49,.895,.145,.765,.698],
  [1.82,.880,.130,.713,.641],[2.06,.835,.124,.615,.590],[NOSE,.791,.153,.509,.553]
];
// The 991 flyline runs from the low front cowl over the hardtop to the sloping rear glass.
const cabinSections = [
  [-1.76,.565,.768,.788],[-1.52,.623,.782,.862],[-1.25,.653,.793,1.003],
  [-.97,.664,.799,1.157],[-.65,.651,.798,1.250],[-.31,.637,.787,1.292],
  [-.06,.627,.777,1.296],[.20,.619,.767,1.254],[.44,.610,.755,1.157],
  [.68,.598,.738,1.013],[.88,.570,.727,.840],[1.00,.532,.710,.747]
];

function profile(rows, z) {
  const upper = rows.findIndex(row => row[0] >= z);
  if (upper < 1) return rows[upper === 0 ? 0 : rows.length - 1].slice(1);
  const a = rows[upper - 1], b = rows[upper];
  const previous = rows[Math.max(0, upper - 2)], next = rows[Math.min(rows.length - 1, upper + 1)];
  const span = b[0] - a[0], t = (z - a[0]) / span, t2 = t * t, t3 = t2 * t;
  return a.slice(1).map((value, i) => {
    const k = i + 1;
    const slopeA = (b[k] - previous[k]) / (b[0] - previous[0]);
    const slopeB = (next[k] - a[k]) / (next[0] - a[0]);
    return (2*t3 - 3*t2 + 1)*value + (t3 - 2*t2 + t)*span*slopeA
      + (-2*t3 + 3*t2)*b[k] + (t3 - t2)*span*slopeB;
  });
}

function add(group, geometry, material, x = 0, y = 0, z = 0, castShadow = false) {
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = castShadow;
  group.add(mesh);
  return mesh;
}

function surface(columns, rows, point, reverse = false) {
  const vertices = [], faces = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const p = point(col / columns, row / rows);
      vertices.push(p.x, p.y, p.z);
      if (row === rows || col === columns) continue;
      const a = row * (columns + 1) + col, b = a + columns + 1;
      if (reverse) faces.push(a, a + 1, b, a + 1, b + 1, b);
      else faces.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function bumperZ(end, x, y) {
  const shoulder = Math.pow(Math.abs(x) / .80, end > 0 ? 2.8 : 3.3);
  const lower = T.MathUtils.smoothstep(.32 - y, 0, .19);
  const upper = end > 0 ? T.MathUtils.smoothstep(y,.34,.59) : T.MathUtils.smoothstep(y,.52,.79);
  return end * (NOSE - .222 * shoulder - .043 * lower - (end > 0 ? .096 : .058) * upper);
}

function lowerEdge(z, sill) {
  let y = sill, lip = 0;
  for (const wheel of WHEELS) {
    const distance = Math.abs(z - wheel.z), radius = wheel.radius + .029;
    if (distance >= radius + .018) continue;
    const blend = 1 - T.MathUtils.smoothstep(distance, radius - .009, radius + .018);
    const arch = wheel.radius + Math.sqrt(Math.max(0, radius * radius - distance * distance));
    y = Math.max(y, T.MathUtils.lerp(sill, arch, blend));
    lip = Math.max(lip, blend);
  }
  return [y, lip];
}

function bodyPoint(z, cross) {
  const [width, sill, shoulder, deck] = profile(bodySections, z);
  const [bottom, arch] = lowerEdge(z, sill);
  const t = Math.abs(cross);
  const side = Math.sign(cross);
  const crown = shoulder + .017;
  const rings = [
    [0, 0, deck], [.20, .48, deck - .003], [.39, .77, T.MathUtils.lerp(deck, crown, .68)],
    [.52, .91, crown], [.63, .98, shoulder - .023], [.74, 1, T.MathUtils.lerp(bottom, shoulder, .71)],
    [.86, .987, T.MathUtils.lerp(bottom, shoulder, .36)], [1, .90 + .09 * arch, bottom]
  ];
  const [xRatio, y] = profile(rings, t);
  const x = side * xRatio * width;
  const endBlend = T.MathUtils.smoothstep(Math.abs(z), 1.44, NOSE);
  const curve = bumperZ(Math.sign(z), x, y) - Math.sign(z) * NOSE;
  return vector(x, y, z + endBlend * curve);
}

function cabinPoint(z, cross, clearance = 0) {
  const [halfWidth, belt, roof] = profile(cabinSections, z);
  const angle = cross * Math.PI / 2;
  return vector((halfWidth + clearance) * Math.sin(angle),
    belt + (roof - belt + clearance) * Math.pow(Math.max(0, Math.cos(angle)), .84), z);
}

function ellipsoid(group, mat, position, size) {
  const mesh = add(group, new T.SphereGeometry(1, 20, 12), mat, ...position);
  mesh.scale.set(...size);
  return mesh;
}

function rounded(group, mat, position, size, radius, shadow = false) {
  return add(group, new RoundedBoxGeometry(...size, 2, radius), mat, ...position, shadow);
}

function trace(group, mat, points, radius, segments = 32) {
  const curve = new T.CatmullRomCurve3(points);
  return add(group, new T.TubeGeometry(curve, segments, radius, 5, false), mat);
}

function ovalRing(group, material, radius, width, x, y, z) {
  const mesh = add(group, new T.TorusGeometry(radius, width, 8, 48), material, x, y, z);
  mesh.rotation.y = Math.PI / 2;
  return mesh;
}

function curvedFascia(group, end, points, mat, offset = .009, shadow = false) {
  const shape = new T.Shape(points);
  shape.closePath();
  const flat = new T.ShapeGeometry(shape);
  const source = flat.attributes.position, vertices = [], normals = [], triangles = [];
  const steps = 5;
  for (let face = 0; face < flat.index.count; face += 3) {
    const a = flat.index.getX(face), b = flat.index.getX(face + 1), c = flat.index.getX(face + 2);
    const rows = [];
    for (let u = 0; u <= steps; u++) {
      rows.push(vertices.length / 3);
      for (let v = 0; v <= steps - u; v++) {
        const blendA = 1 - (u + v) / steps;
        const x = source.getX(a)*blendA + (source.getX(b)*u + source.getX(c)*v)/steps;
        const y = source.getY(a)*blendA + (source.getY(b)*u + source.getY(c)*v)/steps;
        const z = bumperZ(end,x,y);
        vertices.push(x,y,z+end*offset);
        const normal = vector(z-bumperZ(end,x+.001,y),z-bumperZ(end,x,y+.001),.001)
          .normalize().multiplyScalar(end);
        normals.push(normal.x,normal.y,normal.z);
      }
    }
    for (let u = 0; u < steps; u++) {
      for (let v = 0; v < steps - u; v++) {
        const a = rows[u]+v, b = rows[u+1]+v;
        triangles.push(...(end > 0 ? [a,b,a+1] : [a,a+1,b]));
        if (v < steps-u-1) triangles.push(...(end > 0 ? [b,b+1,a+1] : [b,a+1,b+1]));
      }
    }
  }
  flat.dispose();
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setIndex(triangles);
  return add(group,geometry,mat,0,0,0,shadow);
}

function intakeSurface(group, end, points, mat, offset) {
  return curvedFascia(group,end,points.map(([x,y]) => new T.Vector2(x,y)),mat,offset);
}

function closeBumper(group, end, material) {
  // Match the loft's last cross section to the curved fascia, including the rounded corners.
  const points = Array.from({ length: 49 }, (_, i) => bodyPoint(end * NOSE, i / 24 - 1));
  curvedFascia(group,end,points.map(p => new T.Vector2(p.x,p.y)),material,0,true);
}

function wheel(car, specification, side, mats) {
  const { z, track, width, radius, rotor } = specification;
  const axis = side * track / 2, outer = axis + side * width / 2;
  const wheelPivot = new T.Group();
  wheelPivot.position.set(axis, radius, z);
  wheelPivot.userData.rollingRadius = radius;
  const group = new T.Group();
  group.position.copy(wheelPivot.position).negate();
  wheelPivot.add(group);
  car.add(wheelPivot);
  const profile = [
    [.242,-width*.43],[.265,-width*.49],[radius-.027,-width*.48],
    [radius-.008,-width*.38],[radius,-width*.23],[radius,width*.22],
    [radius-.008,width*.38],[radius-.025,width*.46],[.276,width*.50],[.248,width*.46],
    [.239,width*.41],[.239,-width*.41],[.242,-width*.43]
  ];
  const rubber = add(group, new T.LatheGeometry(profile.map(([r, x]) => new T.Vector2(r, x)), 52),
    mats.rubber, axis, radius, z, true);
  rubber.rotation.z = -side * Math.PI / 2;
  for (const fraction of [-.23, -.08, .08, .23]) {
    ovalRing(group, mats.dark, radius - .0015, .0021, axis + fraction * width, radius, z);
  }
  const face = outer - side * .016;
  ovalRing(group, mats.alloy, .246, .0095, face, radius, z);
  ovalRing(group, mats.gunmetal, .232, .012, face - side * .022, radius, z);
  const rotorMesh = add(group, new T.CylinderGeometry(rotor, rotor, .023, 40), mats.rotor,
    face - side * .041, radius, z);
  rotorMesh.rotation.z = Math.PI / 2;
  ovalRing(group, mats.dark, rotor - .022, .0018, face - side * .028, radius, z);
  rounded(group, mats.caliper, [face - side * .031, radius + .12, z - .071], [.047,.105,.088], .018)
    .rotation.x = -.53;

  const spoke = new T.Shape();
  spoke.moveTo(.054, -.023);
  spoke.lineTo(.139, -.022);
  spoke.quadraticCurveTo(.205, -.032, .241, -.051);
  spoke.lineTo(.246, -.032);
  spoke.quadraticCurveTo(.181, -.005, .126, .004);
  spoke.lineTo(.060, .016);
  spoke.closePath();
  const spokeGeo = new T.ExtrudeGeometry(spoke, {
    depth: .009, bevelEnabled: true, bevelThickness: .004, bevelSize: .003, bevelSegments: 1, curveSegments: 5
  });
  const twins = new T.InstancedMesh(spokeGeo, mats.alloy, 10);
  const transform = new T.Object3D();
  transform.position.set(face - side*.005, radius, z);
  for (let i = 0; i < 10; i++) {
    transform.quaternion.setFromEuler(new T.Euler(0, side * Math.PI / 2, 0));
    transform.rotateZ(Math.floor(i / 2) * TAU / 5 + (i % 2 ? .162 : -.031));
    transform.updateMatrix();
    twins.setMatrixAt(i, transform.matrix);
  }
  group.add(twins);
  const hub = add(group, new T.CylinderGeometry(.053,.066,.031,24), mats.gunmetal, face, radius, z);
  hub.rotation.z = -side * Math.PI / 2;
  ellipsoid(group, mats.gold, [face + side*.019,radius,z], [.004,.021,.020]);
  for (let i = 0; i < 5; i++) {
    const angle = i * TAU / 5;
    ellipsoid(group, mats.alloy, [face + side*.017,radius + Math.cos(angle)*.036,z + Math.sin(angle)*.036], [.003,.006,.006]);
  }
}

function headlamp(group, side, mats) {
  const lamp = new T.Group();
  lamp.position.set(side*.663, .711, 1.595);
  lamp.rotation.set(-1.05, side*.19, side*.11);
  group.add(lamp);
  ellipsoid(lamp, mats.trim, [0,0,0], [.145,.215,.030]);
  ellipsoid(lamp, mats.alloy, [0,0,.020], [.129,.199,.018]);
  ellipsoid(lamp, mats.gunmetal, [0,0,.029], [.114,.183,.019]);
  ellipsoid(lamp, mats.alloy, [0,.012,.046], [.062,.068,.014]);
  ellipsoid(lamp, mats.projector, [0,.012,.060], [.048,.053,.018]);
  for (const x of [-.060,.060]) {
    for (const y of [-.092,.101]) ellipsoid(lamp, mats.led, [x,y,.044], [.017,.012,.006]);
  }
  ellipsoid(lamp, mats.lens, [0,0,.049], [.131,.201,.032]).renderOrder = 4;
}

function frontDetails(group, mats) {
  const center = [[-.27,.183],[.27,.183],[.30,.204],[.29,.265],[.23,.281],[-.23,.281],[-.29,.264],[-.30,.204]];
  intakeSurface(group, 1, center, mats.dark);
  for (const y of [.208,.238,.265]) {
    trace(group, mats.gunmetal, [-.253,-.12,0,.12,.253].map(x => vector(x,y,bumperZ(1,x,y)+.013)), .006, 12);
  }
  for (const side of [-1,1]) {
    const intake = [[.346,.184],[.633,.186],[.723,.218],[.732,.292],[.686,.343],[.367,.331],[.333,.29]];
    intakeSurface(group, 1, intake.map(([x,y]) => [side*x,y]), mats.dark);
    for (const y of [.218,.252,.288,.315]) {
      trace(group, mats.gunmetal, [.370,.49,.60,.692].map(x => vector(side*x,y,bumperZ(1,x,y)+.015)), .006, 10);
    }
    trace(group, mats.led, [.38,.49,.60,.685].map(x => vector(side*x,.385,bumperZ(1,x,.385)+.012)), .008, 14);
    headlamp(group, side, mats);
    const bonnetSeam = [1.00,1.16,1.39,1.63,1.88,2.11,2.238].map((z, index) => {
      const p = bodyPoint(z, side * (.34 - index*.026));
      p.y += .003;
      return p;
    });
    trace(group, mats.trim, bonnetSeam, .0032, 28);
  }
  const tip = bodyPoint(1.94, 0);
  ellipsoid(group, mats.gold, [tip.x,tip.y+.006,tip.z], [.027,.006,.032]);
}

function rearDetails(group, mats) {
  const vent = surface(14, 11, (u,v) => {
    const p = bodyPoint(T.MathUtils.lerp(-2.00,-1.70,v), (u-.5)*.70);
    p.y += .004;
    return p;
  });
  add(group, vent, mats.dark);
  for (let i = 0; i < 19; i++) {
    const cross = (i - 9) * .037;
    const points = [-1.99,-1.93,-1.86,-1.79,-1.712].map(z => {
      const p = bodyPoint(z,cross); p.y += .010; return p;
    });
    trace(group, mats.gunmetal, points, .005, 10);
  }

  for (const side of [-1,1]) {
    const light = [[.36,.635],[.43,.613],[.685,.614],[.767,.65],[.777,.697],[.713,.717],[.485,.702],[.378,.680]];
    intakeSurface(group,-1,light.map(([x,y]) => [side*x,y]),mats.smokedRed,.010);
    trace(group,mats.red,[.384,.466,.59,.696,.754].map((x,i) => {
      const y = [.647,.641,.641,.652,.675][i];
      return vector(side*x,y,bumperZ(-1,x,y)-.021);
    }),.012,22);
    for (let i = 0; i < 4; i++) {
      const x = side*(.505+i*.048), y = .678 + i*.002;
      ellipsoid(group,mats.red,[x,y,bumperZ(-1,x,y)-.018],[.009,.006,.004]);
    }
    const outlet = [[.50,.284],[.728,.306],[.737,.356],[.704,.397],[.519,.386]];
    intakeSurface(group,-1,outlet.map(([x,y]) => [side*x,y]),mats.dark,.010);
    for (const x of [side*.544,side*.648]) {
      const z = bumperZ(-1,x,.213)-.019;
      const barrel = add(group,new T.CylinderGeometry(.045,.052,.12,20),mats.dark,x,.213,z+.042);
      barrel.rotation.x = Math.PI/2;
      add(group,new T.TorusGeometry(.043,.006,7,24),mats.alloy,x,.213,z);
    }
  }
  rounded(group,mats.trim,[0,.425,-2.249],[.44,.117,.024],.016);
  const label = document.createElement('canvas');
  label.width = 512; label.height = 128;
  const context = label.getContext('2d');
  context.textAlign = 'center';
  context.fillStyle = '#e2ddd1';
  context.font = 'bold 38px Arial';
  context.fillText('P O R S C H E', 256, 45);
  context.font = 'italic 37px Georgia';
  context.fillText('911 Carrera S', 256, 94);
  const map = new T.CanvasTexture(label);
  map.colorSpace = T.SRGBColorSpace;
  const emblem = add(group,new T.PlaneGeometry(.61,.153),new T.MeshBasicMaterial({
    map, transparent: true, depthWrite: false, alphaTest: .09
  }),0,.568,-2.263);
  emblem.rotation.y = Math.PI;
}

function greenhouse(group, mats) {
  const glass = surface(42,56,(u,v) => cabinPoint(T.MathUtils.lerp(-1.76,1,v),u*2-1));
  const canopy = add(group,glass,mats.glass);
  canopy.renderOrder = 3;
  const roof = surface(30,30,(u,v) => {
    const cross = u*1.58 - .79;
    const rear = -.91 + .22*Math.abs(cross);
    const front = .385 - .11*Math.abs(cross);
    return cabinPoint(T.MathUtils.lerp(rear,front,v),cross,.012);
  });
  add(group,roof,mats.body,0,0,0,true);
  for (const side of [-1,1]) {
    const sill = [-1.69,-1.33,-.83,-.27,.24,.65,.96].map(z => {
      const p = cabinPoint(z,side,.008); p.y += .007; return p;
    });
    trace(group,mats.trim,sill,.011,36);
    const pillars = [[.30,.90,.016],[-.47,-.62,.011],[-.78,-1.51,.023]];
    for (const [top,bottom,radius] of pillars) {
      const points = Array.from({length:12},(_,i) => {
        const t=i/11;
        return cabinPoint(T.MathUtils.lerp(top,bottom,t),side*T.MathUtils.lerp(.74,.999,t),.012);
      });
      trace(group,mats.body,points,radius,18);
    }
    const x = side*.35;
    rounded(group,mats.leather,[x,.795,-.46],[.295,.105,.41],.035);
    rounded(group,mats.leather,[x,.936,-.59],[.284,.291,.105],.045).rotation.x = .23;
    ellipsoid(group,mats.leather,[x,1.085,-.614],[.107,.087,.045]);
    rounded(group,mats.trim,[side*.666,.816,.641],[.127,.048,.074],.019);
    ellipsoid(group,mats.body,[side*.918,.852,.628],[.075,.048,.114]);
    ellipsoid(group,mats.alloy,[side*.920,.856,.558],[.061,.034,.009]);
    const door = [[-.69,.28],[-.66,.61],[-.55,.88],[-.19,.924],[.20,.927],[.53,.90],[.62,.70]]
      .map(([z,t]) => {
        const p = bodyPoint(z,side*t); p.x += side*.005; return p;
      });
    trace(group,mats.trim,door,.0027,28);
    const handle = bodyPoint(-.49,side*.69);
    rounded(group,mats.body,[handle.x+side*.008,handle.y,handle.z],[.019,.025,.148],.008);
  }
  rounded(group,mats.trim,[0,.800,.665],[1.08,.104,.23],.039);
  add(group,new T.TorusGeometry(.108,.013,7,28),mats.trim,-.32,.903,.49).rotation.x = -.27;
  rounded(group,mats.trim,[0,.814,-.050],[.14,.120,.69],.034);
}

export function buildCarrera() {
  const group = new T.Group();
  group.name = 'Porsche 911 Carrera S (991.2)';
  const mats = {
    body:new T.MeshPhysicalMaterial({
      color:0x41482b, metalness:.59, roughness:.23, clearcoat:1,
      clearcoatRoughness:.135, envMapIntensity:1.17, side:T.DoubleSide
    }),
    trim:paint(0x1f221d,.45,.15), dark:paint(0x111310,.75,0,{side:T.DoubleSide}),
    rubber:paint(0x20211e,.74), gunmetal:paint(0x343731,.38,.66),
    alloy:paint(0xc3c4ba,.28,.83), rotor:paint(0x686a60,.51,.74),
    caliper:paint(0x8d251d,.36,.24), gold:paint(0xba934d,.39,.72),
    leather:paint(0x633e29,.62),
    glass:new T.MeshPhysicalMaterial({
      color:0x454e44, metalness:.28, roughness:.16, clearcoat:1, clearcoatRoughness:.13,
      envMapIntensity:.83, transparent:true, opacity:.79, depthWrite:false
    }),
    projector:paint(0x5f7680,.17,.68),
    led:paint(0xf1eee3,.23,.11,{emissive:0xf1eee3,emissiveIntensity:.46}),
    lens:new T.MeshPhysicalMaterial({
      color:0xc5d0cd, metalness:.12, roughness:.10, clearcoat:1, transparent:true,
      opacity:.21, depthWrite:false
    }),
    smokedRed:paint(0x711c18,.27,.29,{side:T.DoubleSide}),
    red:paint(0xbb2924,.26,.13,{emissive:0x7c160d,emissiveIntensity:.62})
  };
  const body = surface(48,152,(u,v) => bodyPoint(T.MathUtils.lerp(-NOSE,NOSE,v),u*2-1));
  add(group,body,mats.body,0,0,0,true);
  closeBumper(group,1,mats.body);
  closeBumper(group,-1,mats.body);
  rounded(group,mats.dark,[0,.16,-.02],[1.56,.10,3.92],.044,true);
  for (const side of [-1,1]) {
    for (const spec of WHEELS) wheel(group,spec,side,mats);
    rounded(group,mats.trim,[side*.734,.157,-.06],[.108,.042,1.64],.014);
  }
  greenhouse(group,mats);
  frontDetails(group,mats);
  rearDetails(group,mats);
  return group;
}
