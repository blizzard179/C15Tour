import { useState } from 'react'

function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query) return

    setLoading(true)

    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}` +
      `&format=json&addressdetails=1&limit=5`

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })

    const data = await res.json()
    setResults(data)
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Rechercher une adresse..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={styles.input}
        />
      </form>

      {loading && <div style={styles.loading}>Recherche...</div>}

      {results.length > 0 && (
        <ul style={styles.list}>
          {results.map(item => (
            <li
              key={item.place_id}
              style={styles.item}
              onClick={() => onSelect(item)}
            >
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SearchBar
