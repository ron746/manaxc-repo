export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-16">
      <div className="container mx-auto px-6 py-8">
        <div className="text-center text-slate-600 text-sm">
          <p>&copy; {new Date().getFullYear()} ManaXC. Where Cross Country Comes Alive.</p>
        </div>
      </div>
    </footer>
  )
}
