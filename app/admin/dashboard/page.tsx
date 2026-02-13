export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">统一待办工作台</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold">待审核交易</h3>
          <p className="text-3xl font-bold text-primary mt-2">0</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold">待审核充值</h3>
          <p className="text-3xl font-bold text-warning mt-2">0</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold">待审核提现</h3>
          <p className="text-3xl font-bold text-error mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
