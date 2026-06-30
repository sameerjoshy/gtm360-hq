export default function HealthCard({ title, value }) {
  return <div className="bg-gray-800 p-4 rounded"><h3>{title}</h3><p className="text-2xl font-bold mt-2">{value}</p></div>
}
