import React from 'react';

type InstructionType = 'NONE' | 'VIDEO' | 'IMAGE' | 'TEXT';

interface InstructionViewerProps {
  instructionType: InstructionType;
  instructionUrl?: string;
  instructionText?: string;
  autoLoop?: boolean;
  className?: string;
}

const InstructionViewer: React.FC<InstructionViewerProps> = ({
  instructionType,
  instructionUrl,
  instructionText,
  autoLoop = true,
  className = ''
}) => {
  if (instructionType === 'NONE') {
    return (
      <div className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}>
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm font-medium">No instructions available</p>
          <p className="text-xs">Follow standard procedure</p>
        </div>
      </div>
    );
  }

  if (instructionType === 'VIDEO' && instructionUrl) {
    const getEmbedUrl = (url: string) => {
      if (url.includes('youtube.com/watch')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=${autoLoop ? 1 : 0}&playlist=${videoId}&mute=1`;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=${autoLoop ? 1 : 0}&playlist=${videoId}&mute=1`;
      }
      if (url.includes('loom.com/share/')) {
        const videoId = url.split('loom.com/share/')[1]?.split('?')[0];
        return `https://www.loom.com/embed/${videoId}?autoplay=1`;
      }
      return url;
    };

    const embedUrl = getEmbedUrl(instructionUrl);

    return (
      <div className={`bg-black rounded-lg overflow-hidden ${className}`}>
        <iframe
          src={embedUrl}
          className="w-full h-full min-h-[300px]"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  if (instructionType === 'IMAGE' && instructionUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg overflow-hidden ${className}`}>
        <img
          src={instructionUrl}
          alt="Step instruction"
          className="w-full h-full object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="flex items-center justify-center h-64 bg-gray-200 rounded-lg">
                  <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="mt-2 text-sm">Failed to load image</p>
                  </div>
                </div>
              `;
            }
          }}
        />
      </div>
    );
  }

  if (instructionType === 'TEXT' && instructionText) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="prose prose-sm max-w-none">
          <div
            className="text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: instructionText
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>')
                .replace(/<\/ul>\s*<ul>/g, '')
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center">
        <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="text-yellow-800 text-sm font-medium">
          Invalid instruction configuration
        </p>
      </div>
    </div>
  );
};

export default InstructionViewer;