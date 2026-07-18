'use client'

import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import { useState } from 'react'

export default function ExportActions({ servicio, cliente, totales }: any) {
  const [isExporting, setIsExporting] = useState(false);

  const formatMoney = (amount: number) => `S/ ${amount.toFixed(2)}`;

  const generateImage = async () => {
    const element = document.getElementById('resumen-card');
    if (!element) throw new Error('No se encontró la tarjeta');
    
    return await toPng(element, { 
      quality: 1, 
      backgroundColor: '#ffffff',
      pixelRatio: 2
    });
  };

  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await generateImage();
      const filename = `Pantiwayta_${servicio.n_orden}_${servicio.cliente || 'NN'}.png`;

      // Intentar usar el compartidor nativo del celular (mucho más confiable en móviles)
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Resumen de Servicio',
            text: `Resumen de servicio #${servicio.n_orden} de Pantiwayta`
          });
          return; // Salir si el share fue exitoso
        }
      } catch (e) {
        console.log("No se pudo usar Native Share, usando método alternativo", e);
      }

      // Fallback: Descarga directa por enlace (para PC y algunos móviles)
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error al generar la imagen:', err);
      alert('Hubo un error al exportar la imagen. Verifica que tu navegador lo permita.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('resumen-card');
      if (!element) return;
      
      const dataUrl = await generateImage();
      
      // Crear PDF con las dimensiones exactas de la tarjeta para que encaje perfecto
      const pdf = new jsPDF({
        orientation: element.offsetWidth > element.offsetHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [element.offsetWidth, element.offsetHeight]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
      pdf.save(`Pantiwayta_${servicio.n_orden}_${servicio.cliente || 'NN'}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Hubo un error al exportar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const getSummaryText = () => {
    let text = `☕ *Resumen de Servicio #${servicio.n_orden}*\n👤 *Cliente:* ${servicio.cliente || 'No especificado'}\n\n`;
    
    if (totales.totalTrillado > 0) {
      text += `*Trillado:* ${formatMoney(totales.totalTrillado)}\n`;
    }
    if (totales.totalSeleccion > 0) {
      text += `*Selección:* ${formatMoney(totales.totalSeleccion)}\n`;
    }
    if (totales.totalTueste > 0) {
      text += `*Tueste:* ${formatMoney(totales.totalTueste)}\n`;
    }
    if (totales.totalMolido > 0) {
      text += `*Molienda:* ${formatMoney(totales.totalMolido)}\n`;
    }
    if (totales.totalEnvasado > 0) {
      text += `*Envasado:* ${formatMoney(totales.totalEnvasado)}\n`;
    }
    
    text += `--------------------------\n💰 *Total a pagar:* ${formatMoney(totales.totalGeneral)}\n\n¡Gracias por confiar en Pantiwayta!`;
    return text;
  };

  const handleWhatsApp = () => {
    let phone = cliente?.telefono || '';
    if (phone) {
      phone = phone.replace(/[^0-9]/g, '');
      if (phone.length === 9) phone = `51${phone}`;
    }
    const text = getSummaryText();
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    const email = cliente?.correo || '';
    const subject = `Resumen de Servicio #${servicio.n_orden} - Pantiwayta`;
    const body = `${getSummaryText()}\n\n(Por favor, adjunta aquí la imagen o PDF del resumen)`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-wrap justify-end gap-3 w-full print:hidden">
      <button 
        onClick={handleWhatsApp}
        className="px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg shadow-lg shadow-green-900/20 font-medium flex items-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"></path>
        </svg>
        WhatsApp
      </button>

      <button 
        onClick={handleEmail}
        className="px-4 py-2 bg-[#c2a077] hover:bg-yellow-600 text-white rounded-lg shadow-lg font-medium flex items-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Correo
      </button>
      
      <button 
        onClick={handleDownloadImage}
        disabled={isExporting}
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shadow-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isExporting ? 'Generando...' : 'Descargar Imagen'}
      </button>

      <button 
        onClick={handleDownloadPDF}
        disabled={isExporting}
        className="px-4 py-2 border border-[#c2a077]/50 hover:bg-[#c2a077]/20 text-[#c2a077] rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        {isExporting ? 'Generando PDF...' : 'Exportar PDF'}
      </button>
    </div>
  )
}
