// Test la funzione removeUnavailableIngredients
function removeUnavailableIngredients(description, unavailableIngredients, locale) {
  if (!unavailableIngredients || unavailableIngredients.length === 0) {
    return description
  }

  // Splitta la descrizione per virgole
  const parts = description.split(',').map(p => p.trim())

  // Ottieni i nomi degli ingredienti non disponibili (in minuscolo per confronto)
  const unavailableNames = unavailableIngredients.map(ing => {
    switch (locale) {
      case 'en': return (ing.nameEn || ing.name).toLowerCase()
      case 'fr': return (ing.nameFr || ing.name).toLowerCase()
      case 'es': return (ing.nameEs || ing.name).toLowerCase()
      case 'he': return (ing.nameHe || ing.name).toLowerCase()
      default: return ing.name.toLowerCase()
    }
  })

  console.log('Unavailable names:', unavailableNames)
  console.log('Parts:', parts)

  // Filtra le parti che non contengono ingredienti non disponibili
  const filteredParts = parts.filter(part => {
    const partLower = part.toLowerCase()
    const shouldRemove = unavailableNames.some(name => partLower.includes(name))
    console.log('Part:', part, '-> shouldRemove:', shouldRemove)
    return !shouldRemove
  })

  return filteredParts.join(', ')
}

// Test con i dati reali
const description = 'Ciabatta, mozzarella, pomodoro, rucola'
const unavailable = [{ id: '1', name: 'Pomodoro' }]

console.log('Original:', description)
console.log('Result:', removeUnavailableIngredients(description, unavailable, 'it'))
