export const getCategoryByName = async (name: string) => {
    const cached = await _brklyn.cache.get('categories_name', name)
    if (cached) return cached

    const category = await _brklyn.db.category.findFirst({
        where: {
            name
        }
    })

    if (category) {
        await _brklyn.cache.setexp('categories_name', name, category, 60 * 60 * 24)
    }

    return category
}

export const getOrCreateCategory = async (name: string) => {
    const cat = await getCategoryByName(name)
    if (cat) return cat
    return createCategory(name)
}

export const createCategory = async (name: string) => {
    const category = await _brklyn.db.category.create({
        data: {
            name,
            emoji: '🎨'
        }
    })

    return category
}
