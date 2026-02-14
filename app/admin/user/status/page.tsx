"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, FileCheck, X, RefreshCw } from "lucide-react";

interface UserStatus {
  id: string;
  username: string;
  real_name: string;
  status: "active" | "frozen" | "cancelled";
  auth_status: "verified" | "pending" | "rejected";
  created_at: string;
}

export default function UserStatusPage() {
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserStatus | null>(null);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/status");
      const data = await res.json();
      if (data.success) setUsers(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, act: string) => {
    try {
      const res = await fetch("/api/user/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: act,
          reason,
          adminId: "admin_id",
          adminName: "管理员",
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("操作成功");
        setSelectedUser(null);
        setReason("");
        setAction("");
        fetchUsers();
      } else {
        alert(data.error || "操作失败");
      }
    } catch (err) {
      alert("操作失败");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户状态管理</h1>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">用户名</th>
              <th className="text-left py-3 px-4">真实姓名</th>
              <th className="text-center py-3 px-4">账户状态</th>
              <th className="text-center py-3 px-4">实名认证</th>
              <th className="text-center py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  加载中...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">{user.username}</td>
                  <td className="py-3 px-4">{user.real_name || "-"}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        user.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.status === "active" ? "正常" : "冻结"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        user.auth_status === "verified"
                          ? "bg-green-100 text-green-700"
                          : user.auth_status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.auth_status === "verified"
                        ? "已认证"
                        : user.auth_status === "pending"
                        ? "待认证"
                        : "已驳回"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center space-x-2">
                    {user.status === "active" ? (
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setAction("freeze");
                        }}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                      >
                        <Lock className="w-3 h-3 inline mr-1" />
                        冻结
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setAction("unfreeze");
                        }}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                      >
                        <Unlock className="w-3 h-3 inline mr-1" />
                        解冻
                      </button>
                    )}
                    {user.auth_status === "pending" && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setAction("auth_approve");
                          }}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          <FileCheck className="w-3 h-3 inline mr-1" />
                          通过
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setAction("auth_reject");
                          }}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          <X className="w-3 h-3 inline mr-1" />
                          驳回
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-4">
              {action === "freeze"
                ? "冻结用户"
                : action === "unfreeze"
                ? "解冻用户"
                : action === "auth_approve"
                ? "审核通过"
                : "审核驳回"}
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              用户: {selectedUser.username}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入操作原因"
              className="w-full px-3 py-2 border rounded-lg mb-4 text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setReason("");
                  setAction("");
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  handleAction(selectedUser.id, action);
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
