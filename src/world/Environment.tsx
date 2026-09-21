function Lighting() {
  return (
    <>
      <ambientLight intensity={0.6} color="#b3c6df" />
      <directionalLight position={[-3, 7, 6]} intensity={2.3} color="#f5e8d9"
        castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9} shadow-camera-right={9}
        shadow-camera-top={10} shadow-camera-bottom={-8}
        shadow-camera-near={0.5} shadow-camera-far={35} shadow-normalBias={0.025} />
      <pointLight position={[2.8, 4, -2]} color="#759efa" intensity={45} distance={18} decay={2} />
      <pointLight position={[-2.5, 2.8, 3.5]} color="#ebc7a1" intensity={14} distance={10} decay={2} />
    </>
  )
}

function Environment() {
  return (
    <>
      <Lighting />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#182339" roughness={0.36} metalness={0.3} />
      </mesh>
      {/* The distant arch frames the inhabitant rather than competing with it. */}
      <mesh position={[-0.9, 4.1, -5.5]} rotation={[0, -0.15, -0.12]} scale={[1, 1.15, 0.8]}
        castShadow receiveShadow>
        <torusGeometry args={[3.3, 0.3, 32, 96]} />
        <meshStandardMaterial color="#34445f" roughness={0.44} metalness={0.5} />
      </mesh>
      <mesh position={[-6, 3.5, -8]} rotation={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 7, 2]} />
        <meshStandardMaterial color="#202c43" roughness={0.75} metalness={0.1} />
      </mesh>
      <mesh position={[6.5, 4.8, -11]} rotation={[0, -0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 9.6, 2]} />
        <meshStandardMaterial color="#263149" roughness={0.6} metalness={0.2} />
      </mesh>
    </>
  )
}

export default Environment
