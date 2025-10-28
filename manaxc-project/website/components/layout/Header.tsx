export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-slate-800">
            ManaXC
          </a>
          <div className="flex gap-6">
            <a href="/meets" className="text-slate-600 hover:text-blue-600 transition-colors">
              Meets
            </a>
            <a href="/season" className="text-slate-600 hover:text-blue-600 transition-colors">
              Season
            </a>
            <a href="/schools" className="text-slate-600 hover:text-blue-600 transition-colors">
              Schools
            </a>
            <a href="/courses" className="text-slate-600 hover:text-blue-600 transition-colors">
              Courses
            </a>
            <a href="/athletes" className="text-slate-600 hover:text-blue-600 transition-colors">
              Athletes
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
