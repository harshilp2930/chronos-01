"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function EarthCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.5, 3.2);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0x334466, 0.4));

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sunLight.position.set(-5, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    rimLight.position.set(5, -2, -5);
    scene.add(rimLight);

    const loader = new THREE.TextureLoader();

    const earthDayTexture = loader.load(
      "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      undefined,
      undefined,
      () => {
        earthMat.map = loader.load(
          "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
        );
        earthMat.needsUpdate = true;
      }
    );
    const earthBumpTexture = loader.load(
      "https://unpkg.com/three-globe/example/img/earth-topology.png",
      undefined,
      undefined,
      () => {
        earthMat.bumpMap = loader.load(
          "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
        );
        earthMat.needsUpdate = true;
      }
    );
    const cloudTexture = loader.load(
      "https://unpkg.com/three-globe/example/img/earth-clouds.png",
      undefined,
      undefined,
      () => {
        cloudMat.map = loader.load(
          "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png"
        );
        cloudMat.needsUpdate = true;
      }
    );

    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthDayTexture,
      bumpMap: earthBumpTexture,
      bumpScale: 0.015,
      specular: new THREE.Color(0x2244aa),
      shininess: 18,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    const cloudGeo = new THREE.SphereGeometry(1.008, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(clouds);

    const atmosGeo = new THREE.SphereGeometry(1.08, 64, 64);
    const atmosMat = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmosphereOuter = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphereOuter);

    const atmosGeo2 = new THREE.SphereGeometry(1.035, 64, 64);
    const atmosMat2 = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmosphereInner = new THREE.Mesh(atmosGeo2, atmosMat2);
    scene.add(atmosphereInner);

    const ISS_RADIUS = 1.066;
    const ISS_INCLINATION = 51.6 * (Math.PI / 180);

    const orbitPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      orbitPoints.push(
        new THREE.Vector3(
          ISS_RADIUS * Math.cos(angle),
          ISS_RADIUS * Math.sin(angle) * Math.sin(ISS_INCLINATION),
          ISS_RADIUS * Math.sin(angle) * Math.cos(ISS_INCLINATION)
        )
      );
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x4f8ef7,
      transparent: true,
      opacity: 0.35,
    });
    const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
    scene.add(orbitLine);

    const issGeo = new THREE.SphereGeometry(0.018, 8, 8);
    const issMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const iss = new THREE.Mesh(issGeo, issMat);
    scene.add(iss);

    const TRAIL_LEN = 10;
    const trailDots: THREE.Mesh[] = [];
    for (let i = 0; i < TRAIL_LEN; i++) {
      const tGeo = new THREE.SphereGeometry(0.009, 6, 6);
      const tMat = new THREE.MeshBasicMaterial({
        color: 0x4f8ef7,
        transparent: true,
        opacity: (1 - i / TRAIL_LEN) * 0.6,
      });
      const dot = new THREE.Mesh(tGeo, tMat);
      scene.add(dot);
      trailDots.push(dot);
    }

    let animId: number;
    let t = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.003;

      earth.rotation.y = t * 0.18;
      clouds.rotation.y = t * 0.22;

      const issAngle = t * 1.2;
      iss.position.set(
        ISS_RADIUS * Math.cos(issAngle),
        ISS_RADIUS * Math.sin(issAngle) * Math.sin(ISS_INCLINATION),
        ISS_RADIUS * Math.sin(issAngle) * Math.cos(ISS_INCLINATION)
      );

      for (let i = 0; i < TRAIL_LEN; i++) {
        const trailAngle = issAngle - (i + 1) * 0.06;
        trailDots[i].position.set(
          ISS_RADIUS * Math.cos(trailAngle),
          ISS_RADIUS * Math.sin(trailAngle) * Math.sin(ISS_INCLINATION),
          ISS_RADIUS * Math.sin(trailAngle) * Math.cos(ISS_INCLINATION)
        );
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      earthGeo.dispose();
      earthMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      atmosGeo2.dispose();
      atmosMat2.dispose();
      orbitGeo.dispose();
      orbitMat.dispose();
      issGeo.dispose();
      issMat.dispose();
      trailDots.forEach((dot) => {
        dot.geometry.dispose();
        (dot.material as THREE.Material).dispose();
      });
      earthDayTexture.dispose();
      earthBumpTexture.dispose();
      cloudTexture.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full pointer-events-none" />;
}
