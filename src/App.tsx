import { useState, useEffect, useRef } from 'react'
import AudioEngine, { MOVEMENT_PRESETS } from './AudioEngine'

interface FrequencyLevels {
  subBass: number;
  bass: number;
  lowMids: number;
  mids: number;
  highMids: number;
  presence: number;
  brilliance: number;
  air: number;
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })
  const [levels, setLevels] = useState<FrequencyLevels>({
    subBass: 0, bass: 0, lowMids: 0, mids: 0,
    highMids: 0, presence: 0, brilliance: 0, air: 0
  })
  const [eq, setEq] = useState({ bass: 0, mid: 0, high: 0 })
  const [volume, setVolume] = useState(1)
  const [lerpSpeed, setLerpSpeedState] = useState(0.1)
  const [movementSpeed, setMovementSpeedState] = useState(1)
  const [lerpEnabled, setLerpEnabledState] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [isPresetAnimating, setIsPresetAnimating] = useState(false)
  const [animationSpeed, setAnimationSpeedState] = useState(1)
  
  const audioEngine = useRef<AudioEngine | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Initialize audio engine
  const initializeAudio = async () => {
    if (!audioEngine.current) {
      audioEngine.current = AudioEngine.getInstance()
    }
    await audioEngine.current.initialize()
    setIsInitialized(true)
  }

  // Animation loop for frequency levels - only runs when playing
  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const updateLevels = () => {
      if (audioEngine.current) {
        const allLevels = audioEngine.current.getAllFrequencyLevels()
        setLevels(allLevels)
      }
      animationFrameRef.current = requestAnimationFrame(updateLevels)
    }

    animationFrameRef.current = requestAnimationFrame(updateLevels)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isPlaying])

  // Reset levels when audio stops
  const resetLevels = () => {
    setLevels({
      subBass: 0, bass: 0, lowMids: 0, mids: 0,
      highMids: 0, presence: 0, brilliance: 0, air: 0
    })
  }

  // Handle file input
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isInitialized) {
      await initializeAudio()
    }

    if (audioEngine.current) {
      await audioEngine.current.loadAudioFile(file)
      setHasAudio(true)
      setIsPlaying(false)
      resetLevels()
    }
  }

  // Handle play/pause
  const togglePlayPause = async () => {
    if (!audioEngine.current || !hasAudio) return

    if (!isInitialized) {
      await initializeAudio()
    }

    if (isPlaying) {
      audioEngine.current.pause()
      setIsPlaying(false)
      resetLevels()
    } else {
      audioEngine.current.play()
      setIsPlaying(true)
    }
  }

  // Handle position changes
  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...position, [axis]: value }
    setPosition(newPosition)
    setSelectedPreset(null)
    setIsPresetAnimating(false)
    
    if (audioEngine.current) {
      audioEngine.current.stopAnimation()
      audioEngine.current.setPosition(newPosition.x, newPosition.y, newPosition.z)
    }
  }

  // Handle preset selection - starts movement animation
  const handlePresetSelect = (index: number) => {
    if (selectedPreset === index && isPresetAnimating) {
      // Clicking same preset stops animation
      setSelectedPreset(null)
      setIsPresetAnimating(false)
      if (audioEngine.current) {
        audioEngine.current.stopAnimation()
      }
    } else {
      setSelectedPreset(index)
      setIsPresetAnimating(true)
      
      if (audioEngine.current) {
        audioEngine.current.applyPreset(index)
      }
    }
  }

  // Handle animation speed change
  const handleAnimationSpeedChange = (value: number) => {
    setAnimationSpeedState(value)
    if (audioEngine.current) {
      audioEngine.current.setAnimationSpeed(value)
    }
  }

  // Handle EQ changes
  const handleEqChange = (band: 'bass' | 'mid' | 'high', value: number) => {
    setEq(prev => ({ ...prev, [band]: value }))
    
    if (audioEngine.current) {
      if (band === 'bass') audioEngine.current.setBassGain(value)
      else if (band === 'mid') audioEngine.current.setMidGain(value)
      else audioEngine.current.setHighGain(value)
    }
  }

  // Handle volume change
  const handleVolumeChange = (value: number) => {
    setVolume(value)
    if (audioEngine.current) {
      audioEngine.current.setVolume(value)
    }
  }

  // Handle lerp speed change
  const handleLerpSpeedChange = (value: number) => {
    setLerpSpeedState(value)
    if (audioEngine.current) {
      audioEngine.current.setLerpSpeed(value)
    }
  }

  // Handle movement speed change
  const handleMovementSpeedChange = (value: number) => {
    setMovementSpeedState(value)
    if (audioEngine.current) {
      audioEngine.current.setMovementSpeed(value)
    }
  }

  // Handle lerp toggle
  const handleLerpToggle = () => {
    const newValue = !lerpEnabled
    setLerpEnabledState(newValue)
    if (audioEngine.current) {
      audioEngine.current.setLerpEnabled(newValue)
    }
  }

  const frequencyBands = [
    { key: 'subBass', label: 'Sub-Bass', range: '20-60Hz', color: 'from-purple-600 to-purple-400', textColor: 'text-purple-400', description: 'Kick/Drops' },
    { key: 'bass', label: 'Bass', range: '60-250Hz', color: 'from-blue-600 to-blue-400', textColor: 'text-blue-400', description: 'Bass Guitar' },
    { key: 'lowMids', label: 'Low Mids', range: '250-500Hz', color: 'from-cyan-600 to-cyan-400', textColor: 'text-cyan-400', description: 'Snare/Toms' },
    { key: 'mids', label: 'Mids', range: '500-2kHz', color: 'from-green-600 to-green-400', textColor: 'text-green-400', description: 'Vocals' },
    { key: 'highMids', label: 'High Mids', range: '2-4kHz', color: 'from-yellow-600 to-yellow-400', textColor: 'text-yellow-400', description: 'Clarity' },
    { key: 'presence', label: 'Presence', range: '4-6kHz', color: 'from-orange-600 to-orange-400', textColor: 'text-orange-400', description: 'Cymbals' },
    { key: 'brilliance', label: 'Brilliance', range: '6-12kHz', color: 'from-red-600 to-red-400', textColor: 'text-red-400', description: 'Hi-Hats' },
    { key: 'air', label: 'Air', range: '12-20kHz', color: 'from-pink-600 to-pink-400', textColor: 'text-pink-400', description: 'Shimmer' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-purple-400">
          3D Spatial Audio Player
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* File Input & Play Button */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Load Audio File
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-300 mb-4
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-600 file:text-white
                  hover:file:bg-purple-700
                  cursor-pointer"
              />
              <div className="flex gap-4 items-center">
                <button
                  onClick={togglePlayPause}
                  disabled={!hasAudio}
                  className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all
                    ${hasAudio 
                      ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer' 
                      : 'bg-gray-600 cursor-not-allowed opacity-50'}`}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:bg-purple-500
                      [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Movement Presets */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-purple-400">
                  Movement Presets
                </h2>
                {isPresetAnimating && (
                  <span className="text-xs text-green-400 animate-pulse">● Active</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">Click to start/stop movement pattern</p>
              <div className="grid grid-cols-5 md:grid-cols-6 gap-2">
                {MOVEMENT_PRESETS.map((preset, index) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetSelect(index)}
                    className={`px-2 py-2 rounded text-xs font-medium transition-all
                      ${selectedPreset === index && isPresetAnimating
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400 animate-pulse' 
                        : selectedPreset === index
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              
              {/* Animation Speed Control */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-300">Animation Speed</label>
                  <span className="text-sm text-purple-400 font-mono">{animationSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={animationSpeed}
                  onChange={(e) => handleAnimationSpeedChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:bg-purple-500
                    [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>
            </div>

            {/* 3D Position Controls */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-purple-400 mb-4">
                3D Position Controls
              </h2>
              
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis} className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-gray-300 uppercase">
                      {axis} {axis === 'x' ? '(Left/Right)' : axis === 'y' ? '(Up/Down)' : '(Front/Back)'}
                    </label>
                    <span className="text-sm text-purple-400 font-mono">
                      {position[axis].toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.05"
                    value={position[axis]}
                    onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:bg-purple-500
                      [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              ))}
            </div>

            {/* Advanced Spatial Controls */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-purple-400 mb-4">
                Advanced Spatial Controls
              </h2>
              
              {/* Lerp Toggle */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-300">Smooth Movement (Lerp)</span>
                <button
                  onClick={handleLerpToggle}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition-all
                    ${lerpEnabled 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-gray-300'}`}
                >
                  {lerpEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Lerp Speed */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-300">Lerp Speed</label>
                  <span className="text-sm text-purple-400 font-mono">{lerpSpeed.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={lerpSpeed}
                  onChange={(e) => handleLerpSpeedChange(parseFloat(e.target.value))}
                  disabled={!lerpEnabled}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                    disabled:opacity-50
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:bg-purple-500
                    [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>

              {/* Movement Speed */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-300">Movement Speed</label>
                  <span className="text-sm text-purple-400 font-mono">{movementSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={movementSpeed}
                  onChange={(e) => handleMovementSpeedChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:bg-purple-500
                    [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* EQ Controls */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-purple-400 mb-4">
                Equalizer (EQ)
              </h2>
              
              <div className="grid grid-cols-3 gap-4">
                {(['bass', 'mid', 'high'] as const).map((band) => (
                  <div key={band} className="text-center">
                    <label className="text-sm font-medium text-gray-300 capitalize mb-2 block">
                      {band}
                    </label>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-purple-400 font-mono mb-1">
                        {eq[band] > 0 ? '+' : ''}{eq[band].toFixed(0)} dB
                      </span>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={eq[band]}
                        onChange={(e) => handleEqChange(band, parseFloat(e.target.value))}
                        className="w-full h-24 bg-gray-700 rounded-lg appearance-none cursor-pointer
                          [writing-mode:vertical-lr]
                          [direction:rtl]
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-4
                          [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:bg-purple-500
                          [&::-webkit-slider-thumb]:rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    handleEqChange('bass', 0)
                    handleEqChange('mid', 0)
                    handleEqChange('high', 0)
                  }}
                  className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                >
                  Reset EQ
                </button>
              </div>
            </div>

            {/* Frequency Levels Display */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-purple-400 mb-4">
                Frequency Levels
              </h2>
              
              <div className="space-y-3">
                {frequencyBands.map(({ key, label, range, color, textColor, description }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-300">{label}</span>
                        <span className="text-gray-500">({range})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{description}</span>
                        <span className={`font-mono ${textColor}`}>
                          {levels[key].toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${color} transition-all duration-75`}
                        style={{ width: `${Math.min(100, levels[key])}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Load an audio file and use the controls to adjust spatial positioning and sound.</p>
          <p className="mt-1">Presets provide accurate body positions. Use lerp for smooth audio transitions.</p>
        </div>
      </div>
    </div>
  )
}

export default App
