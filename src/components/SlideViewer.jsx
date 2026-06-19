"use client";

export default function SlideViewer({
  slides,
  currentSlideIndex,
  onFileUpload,
}) {


  return (
    <div className="flex-[2] min-h-0 rounded-3xl border border-white/5 bg-white/[0.02] p-5 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-white/50 uppercase tracking-widest font-semibold flex items-center gap-3">
          <span className="w-1 h-1 rounded-full bg-white/50" />
          Active Slide
        </h2>

        {slides.length > 0 && (
          <p className="text-xs font-mono text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            Slide {currentSlideIndex + 1} of {slides.length}
          </p>
        )}
      </div>

      {/* Slide Area */}
      <div className="flex-1 rounded-2xl border border-white/10 bg-black/50 flex flex-col items-center justify-center relative overflow-hidden">

        {slides.length === 0 ? (
          <div className="flex flex-col items-center gap-4 z-10 p-6">

            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
              <span className="text-2xl opacity-50">📂</span>
            </div>

            <p className="text-sm text-white/70 font-semibold mb-1">
              Upload Deck Images
            </p>

            <p className="text-xs text-white/40 mb-4 max-w-xs leading-relaxed text-center">
              Export your PowerPoint to PNG/JPG, then highlight all of them and upload here.
            </p>

            <label className="px-6 py-2.5 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-all cursor-pointer group">
              <p className="text-xs font-mono text-purple-300 group-hover:text-purple-200">
                BROWSE FILES
              </p>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={onFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full p-2">

            <img
              src={slides[currentSlideIndex]?.url}
              alt={`Slide ${currentSlideIndex + 1}`}
              className="w-full h-full object-contain rounded-xl"
            />

          </div>
        )}

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      </div>
    </div>
  );
}