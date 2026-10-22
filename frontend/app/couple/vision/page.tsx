'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCoupleStore } from '@/lib/store/coupleStore'
import { weddingThemes, generateMockImages, type GeneratedImage } from '@/lib/mock/themes'
import { Sparkles, ArrowRight, Wand2, RefreshCw } from 'lucide-react'

export default function WeddingVisionPage() {
  const router = useRouter()
  const { weddingProfile } = useCoupleStore()
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])

  const handleGenerate = async () => {
    if (!selectedTheme && !customPrompt) return

    setGenerating(true)
    
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    const prompt = customPrompt || weddingThemes.find(t => t.id === selectedTheme)?.description || ''
    const images = generateMockImages(selectedTheme || 'custom', prompt)
    
    setGeneratedImages(images)
    setGenerating(false)
  }

  const handleContinue = () => {
    router.push('/couple/moodboard')
  }

  return (
    <div className="min-h-screen couple-theme" style={{
      background: '#1E4636'
    }}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gold/10 rounded-full mb-4">
            <Sparkles size={40} className="text-gold" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Create your wedding vision
          </h1>
          <p className="text-lg text-secondary max-w-2xl mx-auto">Shape your wedding vision.</p>
        </div>

        {/* Theme Selection */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-primary mb-6">Choose a style</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weddingThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`card p-0 overflow-hidden text-left transition-all ${
                  selectedTheme === theme.id 
                    ? 'ring-2 ring-gold' 
                    : ''
                }`}
              >
                <div className="aspect-video bg-[#3A2563]/30">
                  <img 
                    src={theme.image} 
                    alt={theme.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-primary mb-2">{theme.name}</h3>
                  <p className="text-sm text-secondary mb-3">{theme.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {theme.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-gold/10 text-gold rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="card p-6 mb-8">
          <label className="block mb-3">
            <span className="text-lg font-semibold text-primary mb-2 block">
              Or describe your own vision
            </span>
            <span className="text-sm text-secondary">
              Tell us what you imagine: colors, style, atmosphere...
            </span>
          </label>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="e.g., I want a romantic garden wedding with pastel pink flowers, fairy lights, and a vintage aesthetic..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </div>

        {/* Generate Button */}
        <div className="flex justify-center mb-12">
          <button
            onClick={handleGenerate}
            disabled={generating || (!selectedTheme && !customPrompt)}
            className="btn btn-primary-couple px-8 py-4 text-lg"
          >
            {generating ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                <span>Generating your vision...</span>
              </>
            ) : (
              <>
                <Wand2 size={20} />
                <span>Generate Moodboard</span>
              </>
            )}
          </button>
        </div>

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <div className="card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">Your wedding vision</h2>
              <button
                onClick={handleGenerate}
                className="btn btn-outline text-sm"
              >
                <RefreshCw size={16} />
                <span>Regenerate</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {generatedImages.map((image) => (
                <div
                  key={image.id}
                  className="aspect-square bg-[#3A2563]/30 rounded-lg overflow-hidden"
                >
                  <img
                    src={image.url}
                    alt="Generated wedding vision"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-[#E2B451]/20">
              <p className="text-sm text-secondary">
                💡 These are AI-generated previews. You can refine them in the next step.
              </p>
              <button
                onClick={handleContinue}
                className="btn btn-primary-couple"
              >
                <span>Continue to Moodboard</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Info Banner */}
        {generatedImages.length === 0 && (
          <div className="card p-6 bg-gold/5 border-gold/20">
            <div className="flex items-start gap-4">
              <Sparkles size={24} className="text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-primary mb-2">
                  How it works
                </h3>
                <ul className="space-y-2 text-sm text-secondary">
                  <li>• Choose a theme or describe your vision</li>
                  <li>• Our AI generates 4 unique moodboard images</li>
                  <li>• Select images you love and add them to your cart</li>
                  <li>• Use your selections to find the perfect planner</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
