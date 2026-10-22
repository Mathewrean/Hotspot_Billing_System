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
      className={`relative min-h-32 border-2 border-black p-4 text-left transition-all ${
        isSelected ? "bg-black text-white shadow-[4px_4px_0_0_#000]" : "bg-white text-black hover:bg-neutral-100 shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] hover:-translate-y-0.5"
      }`}
      onClick={() => onSelect(pkg.value)}
    >
      {pkg.popular && (
        <div className={`absolute right-3 top-3 flex items-center gap-1 text-xs font-semibold ${isSelected ? "text-white" : "text-black"}`}>
          <Star className="h-3 w-3 fill-current" /> Popular
        </div>
      )}
      <div className="text-2xl font-bold">{pkg.price}</div>
      <div className={`mt-5 text-sm font-medium ${isSelected ? "text-white" : "text-neutral-700"}`}>{pkg.label}</div>
      <div className={`mt-1 text-xs ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>{pkg.speed}</div>
    </button>
  )
}

export default PackageCard
