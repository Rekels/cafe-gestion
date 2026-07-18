'use client'

export default function PrintButton() {
  return (
    <div className="flex justify-end mb-4 print:hidden">
      <button 
        onClick={() => window.print()}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md shadow-lg shadow-emerald-900/20 font-medium flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Imprimir a PDF
      </button>
    </div>
  )
}
