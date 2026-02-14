"use client";

import { useState, useEffect } from "react";
import { Database, Download, Upload, RefreshCw } from "lucide-react";

interface BackupRecord {
  id: string;
  created_at: string;
  size: number;
  status: "success" | "failed";
  file_name: string;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [backing, setBacking] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system/backup");
      const data = await res.json();
      if (data.success) setBackups(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBacking(true);
      const res = await fetch("/api/system/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });
      const data = await res.json();
      if (data.success) {
        alert("备份成功");
        fetchBackups();
      }
    } catch (err) {
      alert("备份失败");
    } finally {
      setBacking(false);
    }
  };

  const handleDownload = async (backupId: string) => {
    alert("下载功能开发中");
  };

  const handleRestore = async (backupId: string) => {
    if (confirm("确定要恢复此备份吗？此操作不可撤销！")) {
      try {
        const res = await fetch("/api/system/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore", backupId }),
        });
        const data = await res.json();
        if (data.success) {
          alert("恢复成功");
          fetchBackups();
        }
      } catch (err) {
        alert("恢复失败");
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">数据备份与恢复</h1>
        <button
          onClick={handleBackup}
          disabled={backing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <Database className={`w-4 h-4 ${backing ? "animate-spin" : ""}`} />
          {backing ? "备份中..." : "立即备份"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-slate-600">最后备份时间</p>
          <p className="text-lg font-bold text-blue-900">
            {backups[0]
              ? new Date(backups[0].created_at).toLocaleString()
              : "-"}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-slate-600">备份文件数</p>
          <p className="text-lg font-bold text-green-900">{backups.length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-slate-600">总备份大小</p>
          <p className="text-lg font-bold text-purple-900">
            {(backups.reduce((sum, b) => sum + b.size, 0) / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">备份时间</th>
              <th className="text-left py-3 px-4">文件名</th>
              <th className="text-right py-3 px-4">大小</th>
              <th className="text-center py-3 px-4">状态</th>
              <th className="text-center py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  暂无备份
                </td>
              </tr>
            ) : (
              backups.map((backup) => (
                <tr key={backup.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">
                    {new Date(backup.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">{backup.file_name}</td>
                  <td className="py-3 px-4 text-right">
                    {(backup.size / 1024 / 1024).toFixed(2)} MB
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        backup.status === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {backup.status === "success" ? "成功" : "失败"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center space-x-2">
                    <button
                      onClick={() => handleDownload(backup.id)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      <Download className="w-3 h-3 inline mr-1" />
                      下载
                    </button>
                    <button
                      onClick={() => handleRestore(backup.id)}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                    >
                      <Upload className="w-3 h-3 inline mr-1" />
                      恢复
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
