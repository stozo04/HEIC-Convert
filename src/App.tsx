import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UploadCloud, FileImage, Download, Clock, Trash2, CheckCircle2, AlertCircle, Loader2, ArchiveRestore } from 'lucide-react';
import JSZip from 'jszip';
import { FileTask, HistoryRecord, ConversionStatus } from './types';
import { convertHeicTo, formatBytes, downloadBlob } from './utils/converter';
import { saveToHistory, getHistory, clearHistory } from './utils/db';

export default function App() {
  const [tasks, setTasks] = useState<FileTask[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [targetFormat, setTargetFormat] = useState('jpg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  const handleFiles = (files: FileList | File[]) => {
    const newTasks: FileTask[] = Array.from(files)
      .filter(file => file.name.toLowerCase().endsWith('.heic'))
      .map(file => ({
        id: crypto.randomUUID(),
        originalFile: file,
        originalName: file.name,
        originalSize: file.size,
        targetFormat,
        status: 'pending',
        progress: 0,
      }));

    if (newTasks.length > 0) {
      setTasks(prev => [...prev, ...newTasks]);
    } else {
      alert('Please upload .HEIC files only.');
    }
  };

  const processQueue = useCallback(async () => {
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    if (pendingTasks.length === 0) return;

    for (const task of pendingTasks) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'converting' } : t));
      
      try {
        const blob = await convertHeicTo(task.originalFile, targetFormat);
        
        // Save to history
        const record: HistoryRecord = {
          id: crypto.randomUUID(),
          originalName: task.originalName,
          originalSize: task.originalSize,
          targetFormat: targetFormat,
          convertedSize: blob.size,
          date: Date.now(),
          blob: blob
        };
        await saveToHistory(record);
        
        // Reload history
        const updatedHistory = await getHistory();
        setHistory(updatedHistory);
        
        setTasks(prev => prev.map(t => t.id === task.id ? {
          ...t,
          status: 'success',
          progress: 100,
          convertedBlob: blob
        } : t));

      } catch (err: any) {
        setTasks(prev => prev.map(t => t.id === task.id ? {
          ...t,
          status: 'error',
          error: err.message || 'Conversion failed'
        } : t));
      }
    }
  }, [tasks, targetFormat]);

  useEffect(() => {
    processQueue();
  }, [tasks.length, processQueue]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDownloadZip = async () => {
    const completedTasks = tasks.filter(t => t.status === 'success' && t.convertedBlob);
    if (completedTasks.length === 0) return;

    const zip = new JSZip();
    completedTasks.forEach(task => {
      const newName = task.originalName.replace(/\.heic$/i, `.${task.targetFormat}`);
      // Cast to non-undefined since we filtered above
      zip.file(newName, task.convertedBlob!);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `converted_images_${Date.now()}.zip`);
  };

  const currentTasks = tasks.length > 0;
  const completedCount = tasks.filter(t => t.status === 'success').length;
  const hasHistory = history.length > 0;

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-slate-200 font-sans flex flex-col overflow-x-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0F1115]">
        <div className="flex items-center space-x-3">
          <img src="/favicon.svg" alt="Convert HEIC To Any logo" className="w-9 h-9" />
          <span className="text-xl font-semibold tracking-tight">HEIC<span className="text-indigo-400">Convert</span></span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Left Column: Upload & Queue */}
        <div className="flex-[3] flex flex-col space-y-6">
          {/* Drag & Drop Zone */}
          <div
            className={`h-48 border-2 border-dashed rounded-2xl transition-colors flex flex-col items-center justify-center cursor-pointer ${
              isDragging 
                ? 'border-indigo-400 bg-white/[0.07]' 
                : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              multiple
              accept=".heic,.HEIC"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = ''; // Reset input to allow selecting same file again
              }}
            />
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-lg font-medium text-white">Drop HEIC files here</p>
            <p className="text-sm text-slate-400 mt-1">or <span className="text-indigo-400 underline">browse from your computer</span></p>
          </div>

          {/* Active Queue */}
          {currentTasks && (
            <div className="flex-1 bg-white/5 rounded-2xl border border-white/5 flex flex-col">
              <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Conversion Queue</h2>
                <div className="text-xs text-indigo-400 font-mono">{tasks.length} FILE{tasks.length !== 1 ? 'S' : ''} SELECTED</div>
              </div>
              <div className="flex-1 overflow-hidden p-4 space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className={`flex items-center p-3 bg-[#15171D] rounded-xl border border-white/5 ${task.status === 'pending' ? 'opacity-80' : ''}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
                      task.status === 'error' ? 'bg-red-500/10' :
                      task.status === 'success' ? 'bg-emerald-500/10' :
                      task.status === 'converting' ? 'bg-indigo-500/10' :
                      'bg-slate-700/20'
                    }`}>
                      <span className={`text-xs font-bold ${
                        task.status === 'error' ? 'text-red-400' :
                        task.status === 'success' ? 'text-emerald-400' :
                        task.status === 'converting' ? 'text-indigo-400' :
                        'text-slate-500'
                      }`}>
                        {task.targetFormat.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium text-white truncate">{task.originalName}</p>
                      <p className="text-xs text-slate-500">
                        {formatBytes(task.originalSize)} • {
                          task.status === 'pending' ? 'Waiting' :
                          task.status === 'converting' ? 'Processing...' :
                          task.status === 'success' ? 'Ready' :
                          <span className="text-red-400">{task.error}</span>
                        }
                      </p>
                    </div>

                    {task.status === 'converting' && (
                      <div className="hidden sm:block w-32 mr-6">
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 animate-pulse w-full"></div>
                        </div>
                      </div>
                    )}
                    
                    {task.status === 'success' && task.convertedBlob ? (
                      <button
                        onClick={() => downloadBlob(task.convertedBlob!, task.originalName.replace(/\.heic$/i, `.${task.targetFormat}`))}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                      >
                        Download
                      </button>
                    ) : task.status === 'pending' ? (
                      <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 cursor-pointer" onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-10"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Batch Actions Footer */}
              <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col">
                   <span className="text-xs text-slate-400">Overall Progress</span>
                   <span className="text-sm font-semibold">{Math.round((tasks.filter(t => t.status === 'success' || t.status === 'error').length / tasks.length) * 100)}% Complete</span>
                </div>
                <div className="flex space-x-3 w-full sm:w-auto">
                  {completedCount > 1 && (
                    <button 
                      onClick={handleDownloadZip}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl border border-white/10 transition-all flex items-center justify-center cursor-pointer"
                    >
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      Download ZIP
                    </button>
                  )}
                  {completedCount === tasks.length && (
                    <button 
                      onClick={() => setTasks([])}
                      className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                    >
                      Clear Queue
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Settings & History */}
        <div className="flex-1 flex flex-col space-y-6 lg:max-w-sm">
          {/* Settings Card */}
          <div className="bg-[#15171D] rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center">
              <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
              OUTPUT SETTINGS
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1.5">Format</label>
                <select 
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  className="w-full bg-[#0A0B0D] border border-white/10 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="jpg">JPEG (.jpg)</option>
                  <option value="png">PNG (.png)</option>
                  <option value="webp">WebP (.webp)</option>
                </select>
              </div>
            </div>
          </div>

          {/* History Log */}
          <div className="flex-1 min-h-[300px] bg-[#15171D] rounded-2xl border border-white/5 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center">
                <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                HISTORY
              </h3>
            </div>
            <div className="flex-1 p-4 flex flex-col">
              {!hasHistory ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <p className="text-xs">No conversion history yet.</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 mb-4">
                  {history.map(record => (
                    <div key={record.id} className="flex items-center justify-between group">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-medium text-slate-300 truncate" title={record.originalName}>{record.originalName}</p>
                        <p className="text-[10px] text-slate-500">{new Date(record.date).toLocaleDateString()} • {record.targetFormat.toUpperCase()}</p>
                      </div>
                      <button 
                        onClick={() => downloadBlob(record.blob, record.originalName.replace(/\.heic$/i, `.${record.targetFormat}`))}
                        className="text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 p-1"
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {hasHistory && (
                <div className="mt-auto pt-2">
                  <button 
                    onClick={async () => {
                      if (window.confirm('Clear all conversion history?')) {
                        await clearHistory();
                        setHistory([]);
                      }
                    }}
                    className="w-full py-2 text-[10px] text-slate-500 border border-white/5 rounded-lg hover:bg-white/5 transition-colors uppercase tracking-widest font-semibold cursor-pointer"
                  >
                    Clear All History
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Privacy Footer Badge */}
      <footer className="h-10 shrink-0 bg-[#0A0B0D] px-8 flex items-center justify-center space-x-4 border-t border-white/5 mt-auto">
        <div className="flex items-center text-[10px] text-slate-500">
          <svg className="w-3 h-3 mr-1 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 4.946-3.078 9.17-7.396 10.87a.487.487 0 01-.308 0C5.97 16.17 2.892 11.946 2.892 7c0-.681.057-1.35.166-2.001zm8.341 8.64a1 1 0 11-1.015-1.723 3 3 0 002.4-3.66.999.999 0 111.958.39 5 5 0 01-4.113 5.426l.77.567z" clipRule="evenodd"></path></svg>
          End-to-End Encrypted
        </div>
        <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:block">Browser-based locally processed Engine v2.4.0</div>
      </footer>
    </div>
  );
}
