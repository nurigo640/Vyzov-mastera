export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card text-center p-8">
        <p className="text-lg font-semibold text-gray-700">Нет доступа</p>
        <a href="/" className="btn-primary mt-4 inline-block">На главную</a>
      </div>
    </div>
  )
}
