// 获取画布元素
const canvas = document.getElementById("cube-canvas");

// 创建渲染器
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true, // 允许透明背景
});
renderer.setSize(210, 210);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding; // 输出编码
renderer.toneMapping = THREE.ACESFilmicToneMapping; // 高质量色调映射
renderer.toneMappingExposure = 1; // 调整曝光
renderer.setClearColor(0x000000, 0); // 透明背景

// 启用阴影映射
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 创建场景
const scene = new THREE.Scene();
scene.background = null; // 确保背景透明

// 创建相机（侧视图）
const camera = new THREE.OrthographicCamera(
  -5, // left
  5, // right
  5, // top
  -5, // bottom
  0.1, // near
  1000 // far
);
camera.position.set(5, 4, -5); // 从侧上方观察
camera.lookAt(0, 0, 0);

// 添加静止方向光，用于阴影
const staticLight = new THREE.DirectionalLight(0xffffff, 0.5);
staticLight.position.set(0, 10, 0);
staticLight.castShadow = true; // 启用阴影投射
scene.add(staticLight);

// 添加方向光
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// 加载 HDR 环境贴图
const rgbeLoader = new THREE.RGBELoader();
rgbeLoader.setDataType(THREE.UnsignedByteType);
rgbeLoader.load("/cube-texture.hdr", (hdrTexture) => {
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

  // 使用 PMREMGenerator 预处理 HDR 环境贴图
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
  scene.environment = envMap;
  hdrTexture.dispose();
  pmremGenerator.dispose();

  // 加载其他纹理
  const textureLoader = new THREE.TextureLoader();

  const topTexture = textureLoader.load("/imgs/cube-top.jpg");
  topTexture.encoding = THREE.sRGBEncoding;
  topTexture.wrapS = topTexture.wrapT = THREE.RepeatWrapping;
  topTexture.repeat.set(1, 1);

  const leftTexture = textureLoader.load("/imgs/cube-left.jpg");
  leftTexture.encoding = THREE.sRGBEncoding;
  leftTexture.wrapS = leftTexture.wrapT = THREE.RepeatWrapping;
  leftTexture.repeat.set(1, 1);

  const rightTexture = textureLoader.load("/imgs/cube-right.jpg");
  rightTexture.encoding = THREE.sRGBEncoding;
  rightTexture.wrapS = rightTexture.wrapT = THREE.RepeatWrapping;
  rightTexture.repeat.set(1, 1);

  // 基础材质
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x222222,
    emissiveIntensity: 1,
    roughness: 0.1,
    metalness: 0.6,
    envMap: envMap,
    envMapIntensity: 1.5,
  });

  // 克隆材质用于不同面并分配纹理
  const materialTop = baseMaterial.clone();
  materialTop.map = topTexture;
  materialTop.emissiveMap = topTexture;

  const materialLeft = baseMaterial.clone();
  materialLeft.map = leftTexture;
  materialLeft.emissiveMap = leftTexture;

  const materialRight = baseMaterial.clone();
  materialRight.map = rightTexture;
  materialRight.emissiveMap = rightTexture;

  // 为立方体各面分配材质
  const materials = [
    materialLeft, // 右侧
    materialLeft, // 左侧
    materialTop, // 顶部
    materialTop, // 底部
    materialRight, // 前面
    materialRight, // 后面
  ];

  // 创建带圆角的立方体几何体和网格
  const roundedBoxGeometry = new THREE.RoundedBoxGeometry(4, 4, 4, 16, 0.2);
  const cube = new THREE.Mesh(roundedBoxGeometry, materials);
  cube.castShadow = true;
  scene.add(cube);

  // 投影平面
  const planeGeometry = new THREE.PlaneGeometry(10, 10);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0 }); // 使用 ShadowMaterial，使平面只显示阴影
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2; // 将平面放平
  plane.position.y = -2; // 放置在立方体下方
  plane.receiveShadow = true; // 启用接收阴影
  scene.add(plane);

  // 滚动事件
  window.addEventListener("scroll", () => {
    const minOffsetTop = 160; // canvas 完全重叠距离顶部距离
    const maxOffsetTop = 327; // canvas 重叠开始距离顶部距离
    const cubePositionMaxY = 9.2; // 小方块在三维坐标系中 完全移出摄像机的高度
    if (canvas.getBoundingClientRect().top <= minOffsetTop) {
      cube.position.y = 0;
      planeMaterial.opacity = 0.2;
    } else if (canvas.getBoundingClientRect().top >= maxOffsetTop) {
      cube.position.y = cubePositionMaxY;
      planeMaterial.opacity = 0;
    } else {
      cube.position.y =
        ((canvas.getBoundingClientRect().top - minOffsetTop) /
          (maxOffsetTop - minOffsetTop)) *
        cubePositionMaxY;
      planeMaterial.opacity =
        ((maxOffsetTop - canvas.getBoundingClientRect().top) /
          (maxOffsetTop - minOffsetTop)) *
        0.2;
    }

    // 滚动超过 350px 旋转小方块
    if (window.scrollY > 350) {
      cube.rotation.y = (window.scrollY - 350) * 0.005;
    } else {
      cube.rotation.y = 0;
    }
  });

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);

    // 动态旋转方向光以模拟动态反射
    directionalLight.position.x = 5 * Math.cos(Date.now() * 0.001);
    directionalLight.position.z = 5 * Math.sin(Date.now() * 0.001);
    directionalLight.position.y = 5;
    directionalLight.lookAt(0, 0, 0);

    // 渲染场景
    renderer.render(scene, camera);
  };

  animate();
});
