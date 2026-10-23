import { Star } from "lucide-react"

interface Package {
  label: string
  value: number
  price: string
  speed: string
  color: 'blue' | 'purple' | 'green' | 'yellow'
  popular: boolean
}

const PackageCard = ({ pkg, isSelected, onSelect }: { pkg: Package; isSelected: boolean; onSelect: (value: number) => void }) => {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={`relative min-h-32 border-2 p-4 text-left transition-all ${
        isSelected
          ? "border-sky-600 bg-sky-600 text-white shadow-[4px_4px_0_0_hsl(var(--sky-600))]"
          : "border-black bg-white text-black shadow-[4px_4px_0_0_#000] hover:border-sky-600 hover:shadow-[6px_6px_0_0_hsl(var(--sky-600))] hover:-translate-y-0.5"
      }`}
      onClick={() => onSelect(pkg.value)}
    >
      {pkg.popular && (
        <div className={`absolute right-3 top-3 flex items-center gap-1 text-xs font-semibold ${isSelected ? "text-white" : "text-black"}`}>
          <Star className="h-3 w-3 fill-current" /> Popular
        </div>
      )}
      <div className="text-2xl font-bold">{pkg.price}</div>
      <div className={`mt-5 text-sm font-medium ${isSelected ? "text-white" : "text-slate-900"}`}>{pkg.label}</div>
      <div className={`mt-1 text-xs ${isSelected ? "text-sky-100" : "text-slate-600"}`}>{pkg.speed}</div>
    </button>
  )
}

export default PackageCard
