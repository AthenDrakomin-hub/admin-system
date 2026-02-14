"use client";

import { useState, useEffect } from "react";
import { Send, RefreshCw, X } from "lucide-react";

interface Message {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface User {
  id: string;
  username: string;
}

export default function UserMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "notification",
  });

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/messages");
      const data = await res.json();
      if (data.success) setMessages(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      if (data.success) setUsers(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!selectedUsers.length || !form.title || !form.content) {
      alert("请填写所有必要信息");
      return;
    }

    try {
      const res = await fetch("/api/user/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedUsers,
          title: form.title,
          content: form.content,
          type: form.type,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("消息已发送");
        setShowForm(false);
        setSelectedUsers([]);
        setForm({ title: "", content: "", type: "notification" });
        fetchMessages();
      }
    } catch (err) {
      alert("发送失败");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户消息推送</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <Send className="w-4 h-4" /> 发送消息
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">选择用户</label>
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(
                            selectedUsers.filter((id) => id !== user.id)
                          );
                        }
                      }}
                    />
                    <span className="text-sm">{user.username}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">消息标题</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="输入消息标题"
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">消息内容</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="输入消息内容"
                className="w-full px-3 py-2 border rounded-lg mt-1"
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium">消息类型</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mt-1"
              >
                <option value="notification">通知</option>
                <option value="alert">警告</option>
                <option value="info">信息</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSend}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg"
              >
                发送
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">时间</th>
              <th className="text-left py-3 px-4">标题</th>
              <th className="text-left py-3 px-4">内容</th>
              <th className="text-center py-3 px-4">类型</th>
              <th className="text-center py-3 px-4">状态</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  暂无消息
                </td>
              </tr>
            ) : (
              messages.map((msg) => (
                <tr key={msg.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm">
                    {new Date(msg.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">{msg.title}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {msg.content.substring(0, 50)}...
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                      {msg.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        msg.read
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {msg.read ? "已读" : "未读"}
                    </span>
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
