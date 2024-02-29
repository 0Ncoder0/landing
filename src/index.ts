// 导入 lodash 库，用于实用函数
import _ from "lodash";
// 导入 matter-js 库中的必要模块
import Matter, { Bodies, Body, Composite, Engine, Events, Render, Runner, Vector } from "matter-js";

// 地球类
class Earth {
  // 边数
  public static edges = 16;
  // 半径
  public static radius = 400;
  // 质量
  public static mass = 10000;

  public body: Body; // 地球对应的物体

  public center2edge: number; // 中心到边缘的距离

  public effect = 700; // 影响范围

  constructor(x: number, y: number) {
    // 创建圆形地球物体
    this.body = Bodies.circle(x, y, Earth.radius, { mass: Earth.mass, frictionAir: 0 }, Earth.edges);

    // 计算中心到边缘的距离
    this.center2edge = Earth.radius * Math.cos((2 * Math.PI) / Earth.edges / 2);

    // 设置初始角速度
    Body.setAngularVelocity(this.body, -0.001);
  }
}

// 月球类
class Moon {
  // 边数
  public static edges = 12;
  // 半径
  public static radius = 100;
  // 质量（相对于地球）
  public static mass = Earth.mass / 24;

  public body: Body; // 月球对应的物体

  public center2edge: number; // 中心到边缘的距离

  public effect = 500; // 影响范围

  constructor(x: number, y: number) {
    // 创建圆形月球物体
    this.body = Bodies.circle(x, y, Moon.radius, { mass: Moon.mass, frictionAir: 0 }, Moon.edges);

    // 计算中心到边缘的距离
    this.center2edge = Moon.radius * Math.cos((2 * Math.PI) / Moon.edges / 2);

    // 设置初始角速度
    Body.setAngularVelocity(this.body, -0.00001);
  }

  // 月球绕目标运行的方法
  public orbit(target: Body, delta: number) {
    return () => {
      // 计算目标物体和当前物体之间的角度
      const angle = Vector.angle(target.position, this.body.position);
      // 计算目标物体和当前物体之间的距离
      const distance = Vector.magnitude(Vector.sub(this.body.position, target.position));
      // 计算新的角度
      const next = angle + delta;
      // 根据新的角度和距离计算当前物体的新位置
      const x = target.position.x + distance * Math.cos(next);
      const y = target.position.y + distance * Math.sin(next);
      // 计算新的速度
      const velocity = Vector.mult(Vector.normalise(Vector.sub({ x, y }, this.body.position)), 0.1);
      // 更新当前物体的速度
      Body.setVelocity(this.body, velocity);
    };
  }
}

// 飞船类
class Ship {
  // 半径
  public static radius = 20;
  // 质量
  public static mass = 1;
  // 推力
  public static thrust = 0.00002;
  // 旋转速度
  public static rotate = 0.007;

  public body: Body; // 飞船对应的物体
  public center2edge: number; // 中心到边缘的距离

  public thrust = 0; // 当前推力值
  public rotate = 0; // 当前旋转值

  constructor(x: number, y: number) {
    // 创建多边形飞船物体
    this.body = Bodies.polygon(x, y, 3, Ship.radius, { mass: Ship.mass, frictionAir: 0 });

    // 计算中心到边缘的距离
    this.center2edge = Ship.radius * Math.cos((2 * Math.PI) / 3 / 2);

    // 旋转飞船
    Body.rotate(this.body, Math.PI / 2);
  }

  // 渲染飞船的方法
  public render() {
    const { x, y } = this.body.position;
    const offset = this.center2edge;
    const angle = this.body.angle;
    const head = {
      x: x + Ship.radius * Math.cos(angle + Math.PI),
      y: y + Ship.radius * Math.sin(angle + Math.PI),
    };

    const tail = {
      x: x + (offset + 4) * Math.cos(angle),
      y: y + (offset + 4) * Math.sin(angle),
    };

    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(tail.x, tail.y);
    ctx.stroke();
    ctx.closePath();

    if (!this.thrust) return;
    ctx.beginPath();
    ctx.arc(tail.x, tail.y, 6, 0, angle + Math.PI * 2);
    ctx.strokeStyle = "red";
    ctx.stroke();
    ctx.closePath();
  }

  // 给飞船施加推力的方法
  public thrusting() {
    const angle = ship.body.angle;
    const fx = ship.thrust * Math.cos(angle);
    const fy = ship.thrust * Math.sin(angle);
    Body.applyForce(ship.body, ship.body.position, { x: -fx, y: -fy });
  }

  // 旋转飞船的方法
  public rotating() {
    if (this.rotate) Body.setAngularVelocity(this.body, this.rotate);
  }

  // 停止飞船旋转的方法
  public stopRotation() {
    this.rotate = 0;
    Body.setAngularVelocity(this.body, 0);
  }
}

// 计算两个物体之间的引力的函数
const getGravityForce = (target: Body, other: Body): Vector => {
  const planet = earth.body === other ? earth : moon;

  const dx = other.position.x - target.position.x;
  const dy = other.position.y - target.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > planet.effect) return { x: 0, y: 0 };

  const force = ((target.mass * other.mass) / Math.pow(distance, 2)) * 0.0003;
  const angle = Math.atan2(dy, dx);

  const fx = force * Math.cos(angle);
  const fy = force * Math.sin(angle);

  return { x: fx, y: fy };
};

// 应用引力到所有物体的函数
const gravity = () => {
  const bodies = Composite.allBodies(engine.world);

  bodies.forEach((target) => {
    if (target !== ship.body) return;
    bodies.forEach((other) => {
      if (target === other) return;
      Body.applyForce(target, target.position, getGravityForce(target, other));
    });
  });
};

// 预测飞船路径的函数
const predict = () => {
  const tick = 1000 / 24;
  const steps = (100 * 1000) / tick;

  const target = new Ship(ship.body.position.x, ship.body.position.y).body;
  Object.assign(target, _.cloneDeep(ship.body));

  const path = [];

  const planets = [earth, moon];

  for (let i = 0; i < steps; i++) {
    planets.forEach((planet) => Body.applyForce(target, target.position, getGravityForce(target, planet.body)));

    Body.update(target, tick, 0, 0);
    Body.updateVelocities(target);

    target.force.x = 0;
    target.force.y = 0;
    target.torque = 0;

    const x = target.position.x;
    const y = target.position.y;

    if (planets.some((planet) => Vector.magnitude(Vector.sub({ x, y }, planet.body.position)) < planet.center2edge)) break;

    path.push({ x, y });
  }

  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  path.forEach(({ x, y }) => ctx.lineTo(x, y));
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.stroke();
  ctx.closePath();
};

// 创建画布并添加到页面
const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);
const center = { x: canvas.width / 2, y: canvas.height / 2 };

// 创建物理引擎
const engine = Engine.create({ gravity: { x: 0, y: 0 } });

// 创建渲染器
const render = Render.create({ canvas, engine, options: { width: canvas.width, height: canvas.width } });
const runner = Runner.create();

// 运行渲染器和物理引擎
Render.run(render);
Runner.run(runner, engine);

// 创建地球并添加到物理引擎世界中
const earth = new Earth(center.x, center.y);
Composite.add(engine.world, earth.body);

// 创建月球并添加到物理引擎世界中
const moon = new Moon(center.x + 1000, center.y);
Composite.add(engine.world, moon.body);

// 创建飞船并添加到物理引擎世界中
const ship = new Ship(earth.body.position.x, earth.body.position.y - Earth.radius - Ship.radius + 16);
Composite.add(engine.world, ship.body);

// 注册事件监听器
Events.on(engine, "beforeUpdate", gravity);
Events.on(engine, "beforeUpdate", ship.thrusting.bind(ship));
Events.on(engine, "beforeUpdate", ship.rotating.bind(ship));
Events.on(engine, "beforeUpdate", moon.orbit(earth.body, -0.00001));

Events.on(render, "afterRender", ship.render.bind(ship));
Events.on(render, "afterRender", predict);
Events.on(render, "afterRender", () => {
  if (Matter.Collision.collides(moon.body, ship.body) === null) return;
  Runner.stop(runner);
  Render.stop(render);
  alert("You made it!");
});

// 添加键盘事件监听器
window.addEventListener("keydown", (event) => {
  if (event.key !== " ") return;
  ship.thrust = ship.thrust ? 0 : Ship.thrust;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "a") ship.rotate = -Ship.rotate;
  if (event.key === "d") ship.rotate = Ship.rotate;
  if (event.key === "s") ship.stopRotation();
});

// 操作说明
const div = document.createElement("div");
div.style.position = "fixed";
div.style.top = "0";
div.style.right = "0";
div.style.padding = "10px";
div.style.color = "white";
div.style.zIndex = "999";

div.innerText = `
操作说明：
- 空格键：推进
- A 键：左转
- D 键：右转
- S 键：停止转向
`;

document.body.appendChild(div);
