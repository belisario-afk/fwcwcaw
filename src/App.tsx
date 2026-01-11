import { useState, useEffect, useRef } from 'react'
import AudioEngine from './AudioEngine'

function App() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })
  const [levels, setLevels] = useState({ bass: 0, mids: 0, highs: 0 })
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
        setLevels({
          bass: audioEngine.current.getBassLevel(),
          mids: audioEngine.current.getMidsLevel(),
          highs: audioEngine.current.getHighsLevel(),
        })
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
    setLevels({ bass: 0, mids: 0, highs: 0 })
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
    
    if (audioEngine.current) {
      audioEngine.current.setPosition(newPosition.x, newPosition.y, newPosition.z)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-purple-400">
          3D Spatial Audio Player
        </h1>

        {/* File Input */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Load Audio File
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-600 file:text-white
              hover:file:bg-purple-700
              cursor-pointer"
          />
        </div>

        {/* Play/Pause Button */}
        <div className="mb-8 flex justify-center">
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
        </div>

        {/* Position Sliders */}
        <div className="mb-8 space-y-6 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-purple-400 mb-4">
            3D Position Controls
          </h2>
          
          {(['x', 'y', 'z'] as const).map((axis) => (
            <div key={axis} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300 uppercase">
                  {axis} Position
                </label>
                <span className="text-sm text-purple-400 font-mono">
                  {position[axis].toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.1"
                value={position[axis]}
                onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-purple-500
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:bg-purple-500
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>-5</span>
                <span>0</span>
                <span>5</span>
              </div>
            </div>
          ))}
        </div>

        {/* Frequency Levels Display */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-purple-400 mb-4">
            Frequency Levels
          </h2>
          
          <div className="space-y-4">
            {/* Bass Level */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-300">
                  Bass (0-250Hz)
                </span>
                <span className="text-sm text-blue-400 font-mono">
                  {levels.bass.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-75"
                  style={{ width: `${levels.bass}%` }}
                />
              </div>
            </div>

            {/* Mids Level */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-300">
                  Mids (250-2000Hz)
                </span>
                <span className="text-sm text-green-400 font-mono">
                  {levels.mids.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-75"
                  style={{ width: `${levels.mids}%` }}
                />
              </div>
            </div>

            {/* Highs Level */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-300">
                  Highs (2000-20000Hz)
                </span>
                <span className="text-sm text-yellow-400 font-mono">
                  {levels.highs.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-75"
                  style={{ width: `${levels.highs}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Load an audio file and use the sliders to pan the sound in 3D space.</p>
          <p>X: Left/Right | Y: Up/Down | Z: Front/Back</p>
        </div>
      </div>
    </div>
  )
}

export default App
