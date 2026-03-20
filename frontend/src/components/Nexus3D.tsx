import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default function Nexus3D() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene Setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#020617')
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000)
    camera.position.set(10, 10, 10)
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2)
    scene.add(ambientLight)
    
    const pointLight = new THREE.PointLight(0x034EA2, 100, 100)
    pointLight.position.set(5, 5, 5)
    scene.add(pointLight)

    // Floor Plan
    const gridHelper = new THREE.GridHelper(20, 20, 0x034EA2, 0x1e293b)
    scene.add(gridHelper)

    // Rack Generation (Mock)
    const rackGeometry = new THREE.BoxGeometry(0.8, 2.2, 1)
    for (let i = -5; i <= 5; i += 2) {
      for (let j = -5; j <= 5; j += 2) {
        const material = new THREE.MeshStandardMaterial({ 
          color: 0x1e293b,
          emissive: 0x034EA2,
          emissiveIntensity: Math.random() * 0.5,
          roughness: 0.2
        })
        const rack = new THREE.Mesh(rackGeometry, material)
        rack.position.set(i, 1.1, j)
        scene.add(rack)
      }
    }

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden bg-slate-950 border border-white/5 shadow-2xl relative">
      <div className="absolute top-4 left-4 z-10 space-y-2 pointer-events-none">
        <h3 className="text-sm font-bold tracking-widest text-blue-400 uppercase">Nexus 3D Viewer</h3>
        <p className="text-[10px] text-slate-500 font-mono">Real-time Digital Twin v1.0</p>
      </div>
      <div className="absolute bottom-4 right-4 z-10 flex space-x-4 pointer-events-none">
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          <span className="text-[10px] uppercase text-slate-400">Normal</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
          <span className="text-[10px] uppercase text-slate-400">Overload</span>
        </div>
      </div>
    </div>
  )
}
