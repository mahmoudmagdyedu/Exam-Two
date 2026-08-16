class NutriPlanApi {
  constructor() {
    this.baseUrl = 'https://nutriplan-api.vercel.app/api'
  }

  async get(url, errorMessage = 'Failed to load data') {
    let response = await fetch(url)
    if (!response.ok) throw new Error(errorMessage)
    return await response.json()
  }

  getMeal(id) {
    return this.get(`${this.baseUrl}/meals/${id}`, 'Failed to load meal')
  }

  async analyzeNutrition(ingredients, name) {
    let response = await fetch(`${this.baseUrl}/nutrition/analyze`, {
      method: 'POST',
      headers: {
        'x-api-key': 'iYezH5sdkgS8XfQ4eu7Zgf0Ua6bxDFSdvTEmdd41',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipeName: name,
        ingredients: ingredients.map(e => e.ingredient)
      })
    })
    if (!response.ok) throw new Error('Nutrition service unavailable')
    return await response.json()
  }

  getProductDetails(barcode) {
    return this.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, 'Product details unavailable')
  }
}

class FoodLog {
  constructor() {
    this.storageKey = 'nutriplan_daily_log'
  }

  getAll() {
    return JSON.parse(localStorage.getItem(this.storageKey)) || {}
  }

  saveAll(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  updateTotals(dayData) {
    dayData.totalCalories = dayData.meals.reduce((sum, item) => sum + (Number(item.nutrition?.calories) || 0), 0)
    dayData.totalProtein = dayData.meals.reduce((sum, item) => sum + (Number(item.nutrition?.protein) || 0), 0)
    dayData.totalCarbs = dayData.meals.reduce((sum, item) => sum + (Number(item.nutrition?.carbs) || 0), 0)
    dayData.totalFat = dayData.meals.reduce((sum, item) => sum + (Number(item.nutrition?.fat) || 0), 0)
    return dayData
  }

  addItem(item, date = getTodayKey()) {
    let allLogs = this.getAll()
    let dayData = allLogs[date] || { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, meals: [] }
    dayData.meals.push(item)
    allLogs[date] = this.updateTotals(dayData)
    this.saveAll(allLogs)
  }

  removeItem(index, loggedAt, name, date = getTodayKey()) {
    let allLogs = this.getAll()
    let dayData = allLogs[date]
    if (!dayData || !dayData.meals) return

    let itemIndex = Number(index)
    if (!Number.isInteger(itemIndex) || !dayData.meals[itemIndex]) {
      itemIndex = loggedAt ? dayData.meals.findIndex(e => e.loggedAt === loggedAt) : dayData.meals.findIndex(e => e.name === name)
    }

    if (itemIndex !== -1) dayData.meals.splice(itemIndex, 1)
    allLogs[date] = this.updateTotals(dayData)
    this.saveAll(allLogs)
  }

  clearDay(date = getTodayKey()) {
    let allLogs = this.getAll()
    allLogs[date] = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, meals: [] }
    this.saveAll(allLogs)
  }
}

class Navigation {
  constructor() {
    this.sidebar = document.getElementById('sidebar')
    this.overlay = document.getElementById('sidebar-overlay')
    this.navItems = document.querySelectorAll('#sidebar .nav-link')
    this.foodLogSection = document.getElementById('foodlog-section')
    this.productsSection = document.getElementById('products-section')
    this.homeSections = [document.getElementById('meal-categories-section'), document.getElementById('all-recipes-section')]
    this.mealDetails = document.getElementById('meal-details')
    this.searchSection = document.getElementById('search-filters-section')
    this.pageTitle = document.querySelector('#header h1')
    this.pageDescription = document.querySelector('#header p')
  }

  openSidebar() {
    this.sidebar.classList.add('sidebar-open')
    this.overlay.classList.add('sidebar-overlay-open')
    document.body.classList.add('sidebar-lock')
  }

  closeSidebar() {
    this.sidebar.classList.remove('sidebar-open')
    this.overlay.classList.remove('sidebar-overlay-open')
    document.body.classList.remove('sidebar-lock')
  }

  setActive(page) {
    this.navItems.forEach(item => item.classList.toggle('active', item.innerText.trim() === page))
  }

  changePage(page, updateHistory = true) {
    if (page === 'Food Log') {
      if (updateHistory) history.pushState({}, '', '/foodlog')
      this.foodLogSection.classList.remove('hidden')
      this.homeSections.forEach(section => section.classList.add('hidden'))
      this.productsSection.classList.add('hidden')
      this.mealDetails.classList.add('hidden')
      this.searchSection.classList.add('hidden')
      this.pageTitle.innerHTML = 'Food Log'
      this.pageDescription.innerHTML = 'Track your meals and daily nutrition goals'
      getDateFromLoocal()
    } else if (page === 'Product Scanner') {
      if (updateHistory) history.pushState({}, '', '/productscanner')
      this.foodLogSection.classList.add('hidden')
      this.homeSections.forEach(section => section.classList.add('hidden'))
      this.productsSection.classList.remove('hidden')
      this.mealDetails.classList.add('hidden')
      this.searchSection.classList.add('hidden')
      this.pageTitle.innerHTML = 'Product Scanner'
      this.pageDescription.innerHTML = 'Search products by name or barcode'
    } else {
      page = 'Meals & Recipes'
      if (updateHistory) history.pushState({}, '', '/home')
      this.foodLogSection.classList.add('hidden')
      this.homeSections.forEach(section => section.classList.remove('hidden'))
      this.productsSection.classList.add('hidden')
      this.mealDetails.classList.add('hidden')
      this.searchSection.classList.remove('hidden')
      this.pageTitle.innerHTML = 'Meals & Recipes'
      this.pageDescription.innerHTML = 'Discover delicious and nutritious recipes tailored for you'
    }
    this.setActive(page)
  }

  loadRoute() {
    let route = window.location.pathname.toLowerCase()
    let page = route.includes('foodlog') ? 'Food Log' : route.includes('productscanner') ? 'Product Scanner' : 'Meals & Recipes'
    this.changePage(page, false)
  }
}

class NutriPlanApp {
  constructor() {
    this.api = new NutriPlanApi()
    this.foodLog = new FoodLog()
    this.navigation = new Navigation()
  }
}

let app = new NutriPlanApp()

let randApi = "https://nutriplan-api.vercel.app/api/meals/random?count=25"
let search = document.getElementById('search-input')
let cards = document.querySelectorAll('#recipes-grid>div')
let navItem = document.querySelectorAll('#sidebar>nav>div>ul>li>a')
let foodlogSection = document.getElementById("foodlog-section")
let home = [document.getElementById("meal-categories-section"), document.getElementById("all-recipes-section")]
let productsSection = document.getElementById('products-section')
let productCards = document.getElementById('recipes-grid')
let btns = document.querySelector('#btns')
let reload = window.addEventListener('load', checkApiStatus)
let catBtn = document.querySelector('#categories-grid')
let catBtnChild = document.querySelector('#categories-grid>div')
let logMealBtn = document.getElementById('log-meal-btn')
let sidebar = document.getElementById('sidebar')
let sidebarOverlay = document.getElementById('sidebar-overlay')
let headerMenuBtn = document.getElementById('header-menu-btn')
let sidebarCloseBtn = document.getElementById('sidebar-close-btn')
let pageTitle = document.querySelector('#header h1')
let pageDescription = document.querySelector('#header p')

function getTodayKey() {
    let date = new Date()
    let year = date.getFullYear()
    let month = String(date.getMonth() + 1).padStart(2, '0')
    let day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function openSidebar() {
    app.navigation.openSidebar()
}

function closeSidebar() {
    app.navigation.closeSidebar()
}

headerMenuBtn.addEventListener('click', openSidebar)
sidebarCloseBtn.addEventListener('click', closeSidebar)
sidebarOverlay.addEventListener('click', closeSidebar)
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSidebar()
})

async function checkApiStatus() {
    let loaded = await genCards(randApi)
    if (!loaded) {
      await new Promise(resolve => setTimeout(resolve, 1200))
      await genCards(randApi)
    }
    document.getElementById('app-loading-overlay').classList.add('loading')
}
navItem.forEach(e => e.addEventListener('click', function () {
    locat(this.innerText.trim(), true)
    navItem.forEach(e => e.classList.remove('active'))
    this.classList.add('active')
    closeSidebar()
}))
function locat(e, updateHistory = true) {
    app.navigation.changePage(e, updateHistory)
}

function loadRoute() {
    app.navigation.loadRoute()
}

window.addEventListener('popstate', loadRoute)
loadRoute()
let searchUrl = null
search.addEventListener('keyup', function (e) {
    if (e.key === "Enter") {
        searchUrl = `https://nutriplan-api.vercel.app/api/meals/search?q=${search.value}&page=1&limit=25`
        genCards(searchUrl)
    } else if (search.value.length >= 2) {
        searchUrl = `https://nutriplan-api.vercel.app/api/meals/search?q=${search.value}&page=1&limit=25`
        genCards(searchUrl)
    } else {
        genCards(randApi)
    }
})
async function genCards(url) {
    productCards.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400"><i class="fa-solid fa-spinner fa-spin text-3xl"></i></div>`
    try {
      let apiDate = await app.api.get(url, 'Failed to load meals')
      let results = apiDate.results || []
      let box = ``
      results.forEach(e => {
        box += `
        <div class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group"
              data-meal-id="${e.id}"
            >
              <div class="relative h-48 overflow-hidden">
                <img
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  src="${e.thumbnail}"
                  alt="${e.name}"
                  loading="lazy"
                />
                <div class="absolute bottom-3 left-3 flex gap-2">
                  <span
                    class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-gray-700"
                  >
                    ${e.category}
                  </span>
                  <span
                    class="px-2 py-1 bg-emerald-500 text-xs font-semibold rounded-full text-white"
                  >
                    ${e.area || 'International'}
                  </span>
                </div>
              </div>
              <div class="p-4">
                <h3
                  class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1"
                >
                  ${e.name}
                </h3>
                <p class="text-xs text-gray-600 mb-3 line-clamp-2">
                  ${e.instructions}
                </p>
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-gray-900">
                    <i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>
                    ${e.category}
                  </span>
                  <span class="font-semibold text-gray-500">
                    <i class="fa-solid fa-globe text-blue-500 mr-1"></i>
                    ${e.area || 'International'}
                  </span>
                </div>
              </div>
        </div>
    `
      })
      productCards.innerHTML = box || `<div class="col-span-full text-center py-12 text-gray-500"><i class="fa-solid fa-search text-4xl text-gray-300 mb-3"></i><p>No recipes found</p></div>`
      document.getElementById('recipes-count').innerHTML = `Showing ${results.length} recipe${results.length === 1 ? '' : 's'}`
    let recipesGridCards = document.querySelectorAll('#recipes-grid>div')
    recipesGridCards.forEach(e => e.addEventListener('click', function () {
        let id = this.getAttribute('data-meal-id')
        document.getElementById("meal-categories-section").classList.add('hidden')
        document.getElementById("all-recipes-section").classList.add('hidden')
        document.getElementById("meal-details").classList.remove('hidden')
        document.getElementById('search-filters-section').classList.add('hidden')
        logMealBtn.setAttribute('disabled','')
        logMealBtn.classList.remove('btnActive')
        renderSection(id)
    }))
      return true
    } catch (error) {
      productCards.innerHTML = `<div class="col-span-full text-center py-12 text-red-500"><i class="fa-solid fa-triangle-exclamation text-4xl mb-3"></i><p>Failed to load recipes. Please try again.</p></div>`
      document.getElementById('recipes-count').innerHTML = 'Showing 0 recipes'
      return false
    }
}
document.getElementById('back-to-meals-btn').addEventListener('click',()=>{
        document.getElementById("meal-categories-section").classList.remove('hidden')
        document.getElementById("all-recipes-section").classList.remove('hidden')
        document.getElementById("meal-details").classList.add('hidden')
        document.getElementById('search-filters-section').classList.remove('hidden')
})



async function genButton(url) {
  try {
    let apiDate = await app.api.get(url, 'Failed to load areas')
    let btn = ``
    let areas = (apiDate.results || []).slice(0, 10)
    for (let i = 0; i < areas.length; i++) {
        btn += `
        <button
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium text-sm whitespace-nowrap hover:bg-gray-200 transition-all"
            >
              ${areas[i].name}
        </button>
        `
    }
    btns.innerHTML += btn
    let allBtns = document.querySelectorAll('#btns>button')
    allBtns.forEach(e => e.addEventListener('click', function (e) {
        allBtns.forEach(e => e.classList.remove('active-Two'))
        if (this.innerText.toLowerCase() != "all recipes") {
            this.classList.add('active-Two')
            genCards(`https://nutriplan-api.vercel.app/api/meals/filter?area=${this.innerText.toLowerCase()}`)
        } else {
            genCards(randApi)
            this.classList.add('active-Two')
        }
    }))
  } catch (error) {
    btns.innerHTML += `<span class="text-sm text-gray-400">Areas are unavailable</span>`
  }
}

genButton("https://nutriplan-api.vercel.app/api/meals/areas")
genCat("https://nutriplan-api.vercel.app/api/meals/categories")

async function genCat(url) {
  try {
    let apiDate = await app.api.get(url, 'Failed to load categories')
    let btn = ``

    let results = (apiDate.results || []).slice(0, 12)
    let colors = [
        { bg: "from-red-50 to-rose-50", border: "border-red-200 hover:border-red-400", icon: "from-red-400 to-rose-500" },
        { bg: "from-orange-50 to-amber-50", border: "border-orange-200 hover:border-orange-400", icon: "from-orange-400 to-amber-500" },
        { bg: "from-pink-50 to-fuchsia-50", border: "border-pink-200 hover:border-pink-400", icon: "from-pink-400 to-fuchsia-500" },
        { bg: "from-yellow-50 to-lime-50", border: "border-yellow-200 hover:border-yellow-400", icon: "from-yellow-400 to-lime-500" },
        { bg: "from-gray-50 to-slate-100", border: "border-gray-200 hover:border-gray-400", icon: "from-gray-400 to-slate-500" },
        { bg: "from-yellow-50 to-orange-50", border: "border-yellow-200 hover:border-yellow-400", icon: "from-yellow-400 to-orange-500" },
        { bg: "from-red-50 to-pink-50", border: "border-red-200 hover:border-red-400", icon: "from-red-400 to-pink-500" },
        { bg: "from-teal-50 to-cyan-50", border: "border-teal-200 hover:border-teal-400", icon: "from-teal-400 to-cyan-500" },
        { bg: "from-emerald-50 to-green-50", border: "border-emerald-200 hover:border-emerald-400", icon: "from-emerald-400 to-green-500" },
        { bg: "from-cyan-50 to-sky-50", border: "border-cyan-200 hover:border-cyan-400", icon: "from-cyan-400 to-sky-500" },
        { bg: "from-green-50 to-teal-50", border: "border-green-200 hover:border-green-400", icon: "from-green-400 to-teal-500" },
        { bg: "from-lime-50 to-emerald-50", border: "border-lime-200 hover:border-lime-400", icon: "from-lime-400 to-emerald-500" },
    ]
    for (let i = 0; i < results.length; i++) {
        let c = colors[i % colors.length]
        btn += `
        <div
              class="category-card bg-gradient-to-br ${c.bg} rounded-xl p-3 border ${c.border} hover:shadow-md cursor-pointer transition-all group"
              data-category="${results[i].name}"
            >
            <div class="flex items-center gap-2.5">
                <div
                  class="text-white w-9 h-9 bg-gradient-to-br ${c.icon} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"
                >
                  <i class="fa-solid fa-drumstick-bite"></i>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-gray-900">${results[i].name}</h3>
                </div>
              </div>
        </div>`
    }
    catBtn.innerHTML = btn
    let allCatBtns = document.querySelectorAll('#categories-grid>div')
    allCatBtns.forEach(e => {
        e.addEventListener('click', function () {
            genCards(`https://nutriplan-api.vercel.app/api/meals/filter?category=${this.dataset.category.toLowerCase()}&limit=24`)
        })
    })
  } catch (error) {
    catBtn.innerHTML = `<p class="col-span-full text-center py-8 text-gray-400">Categories are unavailable</p>`
  }
}

let gridViewBtn = document.getElementById('grid-view-btn')
let listViewBtn = document.getElementById('list-view-btn')

gridViewBtn.addEventListener('click', () => {
  productCards.classList.remove('recipes-list-view')
  gridViewBtn.classList.add('bg-white', 'shadow-sm')
  listViewBtn.classList.remove('bg-white', 'shadow-sm')
})

listViewBtn.addEventListener('click', () => {
  productCards.classList.add('recipes-list-view')
  listViewBtn.classList.add('bg-white', 'shadow-sm')
  gridViewBtn.classList.remove('bg-white', 'shadow-sm')
})


let currentMealData = {}

async function renderSection(id) {
    document.getElementById('nutrition-loading').classList.remove('hidden')
    document.getElementById('nutrition-data').classList.add('hidden')

    let apiDate = await app.api.getMeal(id)
    let res = apiDate.result
    currentMealData = {
      mealId: id,
      name: res.name,
      category: res.category,
      area: res.area,
      thumbnail: res.thumbnail
    }
    
    let cont = `
    <div class="relative h-80 md:h-96">
              <img
                src="${res.thumbnail}"
                alt="${res.name}"
                class="w-full h-full object-cover"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
              ></div>
              <div class="absolute bottom-0 left-0 right-0 p-8">
                <div class="flex items-center gap-3 mb-3">
                  <span
                    class="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full"
                    >${res.category}</span
                  >
                  <span
                    class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full"
                    >${res.area}</span
                  >
                </div>
                <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">
                  ${res.name}
                </h1>
                <div class="flex items-center gap-6 text-white/90">
                  <span class="flex items-center gap-2">
                    <i class="fa-solid fa-clock"></i>
                    <span>30 min</span>
                  </span>
                  <span class="flex items-center gap-2">
                    <i class="fa-solid fa-utensils"></i>
                    <span id="hero-servings">4 servings</span>
                  </span>
                  <span class="flex items-center gap-2">
                    <i class="fa-solid fa-fire"></i>
                    <span id="hero-calories"> Calculate...</span>
                  </span>
                </div>
              </div>
            </div>`
          
          document.getElementById('heroSec').innerHTML = cont

        
          let ingredientsHtml = ``
          res.ingredients.forEach(e => {
            ingredientsHtml += `
              <div
                class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors"
              >
                <input
                  type="checkbox"
                  class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300"
                />
                <span class="text-gray-700">
                  <span class="font-medium text-gray-900">${e.measure}</span>
                  ${e.ingredient}
                </span>
              </div>`
          })
          document.getElementById('ingredients-grid').innerHTML = ingredientsHtml
          document.getElementById('ingredients-count').innerHTML = `${res.ingredients.length} items`

        
          let instructionsHtml = ``
          res.instructions.forEach((step, i) => {
            instructionsHtml += `
              <div
                class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div
                  class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0"
                >
                  ${i + 1}
                </div>
                <p class="text-gray-700 leading-relaxed pt-2">
                  ${step}
                </p>
              </div>`
          })
          document.getElementById('instructions-container').innerHTML = instructionsHtml

          
          let videoSection = document.getElementById('video-section')
          if (res.youtube) {
            let videoId = res.youtube.split('v=')[1]
            videoSection.innerHTML = `
              <h2
                class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"
              >
                <i class="fa-solid fa-video text-red-500"></i>
                Video Tutorial
              </h2>
              <div
                class="relative aspect-video rounded-xl overflow-hidden bg-gray-100"
              >
                <iframe
                  src="https://www.youtube.com/embed/${videoId}"
                  class="absolute inset-0 w-full h-full"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                >
                </iframe>
              </div>`
            videoSection.classList.remove('hidden')
          } else {
            videoSection.classList.add('hidden')
          }

          usdaApi(res.ingredients , res.name)
         
}

async function usdaApi(ingredients , name) {
 try {
  let dataAPI = await app.api.analyzeNutrition(ingredients, name)

  if (dataAPI.success && dataAPI.data) {
    let d = dataAPI.data
    let ps = d.perServing
    let t = d.totals

    currentMealData.calories = ps.calories
    currentMealData.protein = ps.protein
    currentMealData.carbs = ps.carbs
    currentMealData.fat = ps.fat
    currentMealData.servings = d.servings

    document.getElementById('hero-calories').innerHTML = ps.calories + ' cal/serving'
    document.getElementById('hero-servings').innerHTML = d.servings + ' servings'

    let maxVal = Math.max(ps.protein, ps.carbs, ps.fat, ps.fiber, ps.sugar, 1)

    document.getElementById('nf-cal-serving').innerHTML = ps.calories
    document.getElementById('nf-cal-total').innerHTML = t.calories

    document.getElementById('nf-protein').innerHTML = ps.protein + 'g'
    document.getElementById('nf-protein-bar').style.width = Math.round((ps.protein / maxVal) * 100) + '%'

    document.getElementById('nf-carbs').innerHTML = ps.carbs + 'g'
    document.getElementById('nf-carbs-bar').style.width = Math.round((ps.carbs / maxVal) * 100) + '%'

    document.getElementById('nf-fat').innerHTML = ps.fat + 'g'
    document.getElementById('nf-fat-bar').style.width = Math.round((ps.fat / maxVal) * 100) + '%'

    document.getElementById('nf-fiber').innerHTML = ps.fiber + 'g'
    document.getElementById('nf-fiber-bar').style.width = Math.round((ps.fiber / maxVal) * 100) + '%'

    document.getElementById('nf-sugar').innerHTML = ps.sugar + 'g'
    document.getElementById('nf-sugar-bar').style.width = Math.round((ps.sugar / maxVal) * 100) + '%'

    document.getElementById('nf-saturated').innerHTML = ps.saturatedFat + 'g'
    document.getElementById('nf-cholesterol').innerHTML = ps.cholesterol + 'mg'
    document.getElementById('nf-sodium').innerHTML = ps.sodium + 'mg'
    document.getElementById('nf-weight').innerHTML = d.totalWeight + 'g'

    document.getElementById('nutrition-loading').classList.add('hidden')
    document.getElementById('nutrition-data').classList.remove('hidden')
    logMealBtn.removeAttribute('disabled')
    logMealBtn.classList.add('btnActive')
  } else {
    throw new Error('Nutrition data unavailable')
  }
 } catch (error) {
    currentMealData.calories = 0
    currentMealData.protein = 0
    currentMealData.carbs = 0
    currentMealData.fat = 0
    document.getElementById('nutrition-loading').innerHTML = `
      <i class="fa-solid fa-triangle-exclamation text-2xl text-amber-500 mb-2"></i>
      <p class="text-sm text-gray-500">Nutrition data is temporarily unavailable.</p>`
    document.getElementById('hero-calories').innerHTML = 'Nutrition unavailable'
    logMealBtn.removeAttribute('disabled')
    logMealBtn.classList.add('btnActive')
 }
}
logMealBtn.setAttribute('disabled','')

let logModal = document.getElementById('log-meal-modal')
let cancelLogBtn = document.getElementById('cancel-log-btn')
let confirmLogBtn = document.getElementById('confirm-log-btn')
let servingsInput = document.getElementById('modal-servings-input')
let increaseBtn = document.getElementById('servings-increase-btn')
let decreaseBtn = document.getElementById('servings-decrease-btn')


function updateModalNutrition() {
  let servings = servingsInput.value || 1
  document.getElementById('modal-cal').innerHTML = currentMealData.calories * servings
  document.getElementById('modal-protein').innerHTML = currentMealData.protein * servings + 'g'
  document.getElementById('modal-carbs').innerHTML = currentMealData.carbs * servings + 'g'
  document.getElementById('modal-fat').innerHTML = currentMealData.fat * servings + 'g'
}

logMealBtn.addEventListener('click', () => {
  document.getElementById('modal-meal-img').src = currentMealData.thumbnail
  document.getElementById('modal-meal-name').innerHTML = currentMealData.name
  servingsInput.value = 1
  updateModalNutrition()
  logModal.classList.remove('hidden')
  
})

cancelLogBtn.addEventListener('click', () => {
  logModal.classList.add('hidden')
})

logModal.addEventListener('click', (e) => {
  if (e.target === logModal) logModal.classList.add('hidden')
})

increaseBtn.addEventListener('click', () => {
  servingsInput.value = Number(servingsInput.value)  + 0.5
  updateModalNutrition()
})

decreaseBtn.addEventListener('click', () => {
  if (Number(servingsInput.value) > 0.5) {
    servingsInput.value = Number(servingsInput.value) - 0.5
    updateModalNutrition()
  }
})

servingsInput.addEventListener('input', () => {
  updateModalNutrition()
})

confirmLogBtn.addEventListener('click', () => {
  let servings = Number(servingsInput.value) || 1

  let cal = Math.round((currentMealData.calories || 0) * servings)
  let prot = Math.round((currentMealData.protein || 0) * servings)
  let carb = Math.round((currentMealData.carbs || 0) * servings)
  let ft = Math.round((currentMealData.fat || 0) * servings)

  let mealEntry = {
    type: "meal",
    name: currentMealData.name,
    mealId: currentMealData.mealId,
    category: currentMealData.category,
    thumbnail: currentMealData.thumbnail,
    servings: servings,
    nutrition: {
      calories: cal,
      protein: prot,
      carbs: carb,
      fat: ft
    },
    loggedAt: new Date().toISOString()
  }

  app.foodLog.addItem(mealEntry)
  logModal.classList.add('hidden')

  Swal.fire({
    icon: 'success',
    title: 'Meal Logged!',
    text: `${currentMealData.name} (${servings} serving${servings > 1 ? 's' : ''}) added to your food log.`,
    confirmButtonColor: '#10b981'
  })
  getDateFromLoocal()
})


let productSearch = document.getElementById('products-grid')
let barcodeInput = document.getElementById('barcode-input')
let productSearchInput = document.getElementById('product-search-input')
let lookupBarcodeBtn = document.getElementById('lookup-barcode-btn')
let searchProductBtn = document.getElementById('search-product-btn')
let productsCount = document.getElementById('products-count')
let currentProducts = []


lookupBarcodeBtn.addEventListener('click', () => {
  if (barcodeInput.value) {
    genProduct(`https://nutriplan-api.vercel.app/api/products/barcode/${barcodeInput.value.trim()}`)
  }
})

barcodeInput.addEventListener('keyup', function (e) {
  if (e.key === "Enter" && this.value) {
    genProduct(`https://nutriplan-api.vercel.app/api/products/barcode/${this.value.trim()}`)
  }
})


searchProductBtn.addEventListener('click', () => {
  if (productSearchInput.value) {
    genProduct(`https://nutriplan-api.vercel.app/api/products/search?q=${productSearchInput.value.trim()}&page=1&limit=24`)
  }
})

productSearchInput.addEventListener('keyup', function (e) {
  if (e.key === "Enter" && this.value) {
    genProduct(`https://nutriplan-api.vercel.app/api/products/search?q=${this.value.trim()}&page=1&limit=24`)
  } else if (this.value.length >= 2) {
    genProduct(`https://nutriplan-api.vercel.app/api/products/search?q=${this.value.trim()}&page=1&limit=24`)
  }
})


let productCatBtns = document.querySelectorAll('#product-categories > button')
productCatBtns.forEach(btn => {
  btn.addEventListener('click', function () {
    let catName = this.innerText.trim()
    productSearchInput.value = catName
    genProduct(`https://nutriplan-api.vercel.app/api/products/search?q=${catName}&page=1&limit=24`)
  })
})


let nutriScoreBtns = document.querySelectorAll('.nutri-score-filter')
nutriScoreBtns.forEach(btn => {
  btn.addEventListener('click', function () {
    nutriScoreBtns.forEach(b => {
      b.classList.remove('bg-emerald-600', 'text-white')
    })
    this.classList.add('bg-emerald-600', 'text-white')
    
    let grade = this.dataset.grade
    if (grade) {
      let filtered = currentProducts.filter(p => p.nutritionGrade && p.nutritionGrade.toLowerCase() === grade.toLowerCase())
      renderProducts(filtered)
    } else {
      renderProducts(currentProducts)
    }
  })
})


function getNutriScoreColor(grade) {
  if (!grade) return 'bg-gray-500'
  let colors = {
    a: 'bg-green-500',
    b: 'bg-lime-500',
    c: 'bg-yellow-500',
    d: 'bg-orange-500',
    e: 'bg-red-500'
  }
  return colors[grade.toLowerCase()] || 'bg-gray-500'
}


function getNovaColor(nova) {
  if (!nova) return 'bg-gray-500'
  let colors = {
    1: 'bg-green-500',
    2: 'bg-lime-500',
    3: 'bg-orange-500',
    4: 'bg-red-500'
  }
  return colors[nova] || 'bg-gray-500'
}


function renderProducts(items) {
  if (!items || items.length === 0) {
    productSearch.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fa-solid fa-box-open text-4xl text-gray-300 mb-3"></i>
        <p class="text-gray-500 font-medium">No products found</p>
      </div>`
    if (productsCount) productsCount.innerHTML = `Found 0 products`
    return
  }

  if (productsCount) productsCount.innerHTML = `Showing ${items.length} products`

  let proCard = ``
  items.forEach(p => {
    let img = p.image || 'https://images.openfoodfacts.org/images/products/316/893/015/9742/front_fr.54.400.jpg'
    let calories = p.nutrients && p.nutrients.calories ? Math.round(p.nutrients.calories) : 0
    let protein = p.nutrients && p.nutrients.protein ? Number(p.nutrients.protein).toFixed(1) : '0'
    let carbs = p.nutrients && p.nutrients.carbs ? Number(p.nutrients.carbs).toFixed(1) : '0'
    let fat = p.nutrients && p.nutrients.fat ? Number(p.nutrients.fat).toFixed(1) : '0'
    let sugar = p.nutrients && p.nutrients.sugar ? Number(p.nutrients.sugar).toFixed(1) : '0'

    proCard += `
      <div
        class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group"
        data-barcode="${p.barcode || ''}"
      >
        <div
          class="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden"
        >
          <img
            class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
            src="${img}"
            alt="${p.name || 'Product'}"
            loading="lazy"
            onerror="this.src='https://images.openfoodfacts.org/images/products/316/893/015/9742/front_fr.54.400.jpg'"
          />

          <!-- Nutri-Score Badge -->
          ${p.nutritionGrade ? `
          <div
            class="absolute top-2 left-2 ${getNutriScoreColor(p.nutritionGrade)} text-white text-xs font-bold px-2 py-1 rounded uppercase shadow-sm"
          >
            Nutri-Score ${p.nutritionGrade.toUpperCase()}
          </div>` : ''}

          <!-- NOVA Badge -->
          ${p.novaGroup ? `
          <div
            class="absolute top-2 right-2 ${getNovaColor(p.novaGroup)} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
            title="NOVA ${p.novaGroup}"
          >
            ${p.novaGroup}
          </div>` : ''}
        </div>

        <div class="p-4">
          <p
            class="text-xs text-emerald-600 font-semibold mb-1 truncate"
          >
            ${p.brand || 'General Brand'}
          </p>
          <h3
            class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors"
          >
            ${p.name || 'Unnamed Product'}
          </h3>

          <div
            class="flex items-center gap-3 text-xs text-gray-500 mb-3"
          >
            ${p.barcode ? `<span><i class="fa-solid fa-barcode mr-1"></i>${p.barcode}</span>` : ''}
            <span><i class="fa-solid fa-fire mr-1"></i>${calories} kcal/100g</span>
          </div>

          <!-- Mini Nutrition -->
          <div class="grid grid-cols-4 gap-1 text-center">
            <div class="bg-emerald-50 rounded p-1.5">
              <p class="text-xs font-bold text-emerald-700">${protein}g</p>
              <p class="text-[10px] text-gray-500">Protein</p>
            </div>
            <div class="bg-blue-50 rounded p-1.5">
              <p class="text-xs font-bold text-blue-700">${carbs}g</p>
              <p class="text-[10px] text-gray-500">Carbs</p>
            </div>
            <div class="bg-purple-50 rounded p-1.5">
              <p class="text-xs font-bold text-purple-700">${fat}g</p>
              <p class="text-[10px] text-gray-500">Fat</p>
            </div>
            <div class="bg-orange-50 rounded p-1.5">
              <p class="text-xs font-bold text-orange-700">${sugar}g</p>
              <p class="text-[10px] text-gray-500">Sugar</p>
            </div>
          </div>
        </div>
      </div>`
  })

  productSearch.innerHTML = proCard

  let allProductCards = document.querySelectorAll('#products-grid .product-card')
  allProductCards.forEach((card, index) => {
    card.addEventListener('click', function () {
      let p = items[index]
      showProductModal(p)
    })
  })
}


let productModal = document.getElementById('product-modal')
let productModalCloseBtn = document.getElementById('product-modal-close-btn')
let productModalCancelBtn = document.getElementById('product-modal-cancel-btn')
let productModalLogBtn = document.getElementById('product-modal-log-btn')
let currentSelectedProduct = null

async function showProductModal(p) {
  currentSelectedProduct = p

  let img = p.image || 'https://images.openfoodfacts.org/images/products/316/893/015/9742/front_fr.54.400.jpg'
  document.getElementById('product-modal-img').src = img
  document.getElementById('product-modal-brand').innerHTML = p.brand || 'General Brand'
  document.getElementById('product-modal-name').innerHTML = p.name || 'Product Details'

  let badgesHtml = ''
  if (p.nutritionGrade) {
    let g = p.nutritionGrade.toLowerCase()
    let gradeDesc = { a: 'Excellent', b: 'Good', c: 'Average', d: 'Poor', e: 'Bad' }
    let desc = gradeDesc[g] || ''
    let color = getNutriScoreColor(g)
    badgesHtml += `
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200/80">
        <div class="w-6 h-6 rounded-lg ${color} text-white font-bold text-xs flex items-center justify-center">${g.toUpperCase()}</div>
        <div class="leading-tight text-left">
          <p class="text-[11px] font-bold text-gray-800">Nutri-Score</p>
          ${desc ? `<p class="text-[9px] text-gray-400 capitalize">${desc}</p>` : ''}
        </div>
      </div>`
  }

  if (p.novaGroup) {
    let novaDesc = { 1: 'Unprocessed', 2: 'Processed culinary', 3: 'Processed food', 4: 'Ultra-processed' }
    let desc = novaDesc[p.novaGroup] || ''
    let color = getNovaColor(p.novaGroup)
    badgesHtml += `
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200/80">
        <div class="w-6 h-6 rounded-lg ${color} text-white font-bold text-xs flex items-center justify-center">${p.novaGroup}</div>
        <div class="leading-tight text-left">
          <p class="text-[11px] font-bold text-gray-800">NOVA</p>
          ${desc ? `<p class="text-[9px] text-gray-400 capitalize">${desc}</p>` : ''}
        </div>
      </div>`
  }
  document.getElementById('product-modal-badges').innerHTML = badgesHtml


  let n = p.nutrients || {}
  document.getElementById('product-modal-cal').innerHTML = n.calories ? Math.round(n.calories) : 0
  document.getElementById('product-modal-protein').innerHTML = n.protein ? Number(n.protein).toFixed(1) + 'g' : '0g'
  document.getElementById('product-modal-carbs').innerHTML = n.carbs ? Number(n.carbs).toFixed(1) + 'g' : '0g'
  document.getElementById('product-modal-fat').innerHTML = n.fat ? Number(n.fat).toFixed(1) + 'g' : '0g'
  document.getElementById('product-modal-sugar').innerHTML = n.sugar ? Number(n.sugar).toFixed(1) + 'g' : '0g'
  document.getElementById('product-modal-saturated').innerHTML = n.saturatedFat ? Number(n.saturatedFat).toFixed(1) + 'g' : '0g'
  document.getElementById('product-modal-fiber').innerHTML = n.fiber ? Number(n.fiber).toFixed(1) + 'g' : '0.0g'
  document.getElementById('product-modal-salt').innerHTML = n.sodium ? (Number(n.sodium) * 2.5).toFixed(2) + 'g' : '0.0g'

  let ingSection = document.getElementById('product-modal-ingredients-section')
  let ingEl = document.getElementById('product-modal-ingredients')
  let allSection = document.getElementById('product-modal-allergens-section')
  let allEl = document.getElementById('product-modal-allergens')

  ingEl.innerHTML = 'Loading ingredients...'
  allSection.classList.add('hidden')
  productModal.classList.remove('hidden')


  if (p.barcode) {
    try {
      let offData = await app.api.getProductDetails(p.barcode)
      if (offData.status === 1 && offData.product) {
        let prod = offData.product


        let ingredientsText = prod.ingredients_text || prod.ingredients_text_en || prod.ingredients_text_fr || prod.ingredients_text_ar
        if (ingredientsText) {
          ingEl.innerHTML = ingredientsText
          ingSection.classList.remove('hidden')
        } else {
          ingEl.innerHTML = 'Ingredients information not available for this product.'
        }


        let allergens = prod.allergens || (Array.isArray(prod.allergens_tags) ? prod.allergens_tags.map(a => a.replace(/^[a-z]{2}:/, '')).join(', ') : '')
        if (allergens && allergens.trim().length > 0) {
          allEl.innerHTML = allergens.replace(/^[a-z]{2}:/, '')
          allSection.classList.remove('hidden')
        } else {
          allSection.classList.add('hidden')
        }

        if (prod.nutriments) {
          if (prod.nutriments['saturated-fat_100g'] !== undefined) {
            document.getElementById('product-modal-saturated').innerHTML = Number(prod.nutriments['saturated-fat_100g']).toFixed(1) + 'g'
          }
          if (prod.nutriments['fiber_100g'] !== undefined) {
            document.getElementById('product-modal-fiber').innerHTML = Number(prod.nutriments['fiber_100g']).toFixed(1) + 'g'
          }
          if (prod.nutriments['salt_100g'] !== undefined) {
            document.getElementById('product-modal-salt').innerHTML = Number(prod.nutriments['salt_100g']).toFixed(2) + 'g'
          }
        }
      } else {
        ingEl.innerHTML = 'Ingredients information not available for this product.'
      }
    } catch (err) {
      ingEl.innerHTML = 'Ingredients information not available for this product.'
    }
  } else {
    ingEl.innerHTML = 'Ingredients information not available for this product.'
  }
}


productModalCloseBtn.addEventListener('click', () => {
  productModal.classList.add('hidden')
})

productModalCancelBtn.addEventListener('click', () => {
  productModal.classList.add('hidden')
})

productModal.addEventListener('click', (e) => {
  if (e.target === productModal) {
    productModal.classList.add('hidden')
  }
})


productModalLogBtn.addEventListener('click', () => {
  if (!currentSelectedProduct) return

  let n = currentSelectedProduct.nutrients || {}
  let calories = Math.round(n.calories || 0)
  let protein = Math.round(n.protein || 0)
  let carbs = Math.round(n.carbs || 0)
  let fat = Math.round(n.fat || 0)

  let productEntry = {
    type: "product",
    name: currentSelectedProduct.name || "Product",
    barcode: currentSelectedProduct.barcode || "",
    brand: currentSelectedProduct.brand || "",
    thumbnail: currentSelectedProduct.image || "",
    servings: 1,
    nutrition: {
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat
    },
    loggedAt: new Date().toISOString()
  }

  app.foodLog.addItem(productEntry)
  productModal.classList.add('hidden')

  Swal.fire({
    icon: 'success',
    title: 'Food Logged!',
    text: `${currentSelectedProduct.name || 'Product'} added to your food log.`,
    confirmButtonColor: '#10b981'
  })
  getDateFromLoocal()
})

async function genProduct(val) {
  try {
    let apiData = await app.api.get(val, 'Failed to load products')
    
    if (apiData.results) {
      currentProducts = apiData.results
    } else if (apiData.result) {
      currentProducts = [apiData.result]
    } else {
      currentProducts = []
    }

    renderProducts(currentProducts)
  } catch (error) {
    productSearch.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-3"></i>
        <p class="text-gray-500 font-medium">Failed to load products</p>
      </div>`
  }
}

genProduct("https://nutriplan-api.vercel.app/api/products/search?q=snacks&page=1&limit=24")

document.getElementById('LogaMeal').addEventListener('click' ,()=> {
  locat('Meals & Recipes')
  navItem.forEach(e => e.classList.toggle('active', e.innerText.trim() === 'Meals & Recipes'))
})
document.getElementById('ScanProduct').addEventListener('click' , ()=>{
  locat("Product Scanner")
  navItem.forEach(e => e.classList.toggle('active', e.innerText.trim() === 'Product Scanner'))
})
document.getElementById('CustomEntry').addEventListener('click' , async ()=>{
  let result = await Swal.fire({
    title: 'Add Custom Food',
    html: `
      <input id="custom-name" class="swal2-input" placeholder="Food name">
      <input id="custom-calories" type="number" min="0" class="swal2-input" placeholder="Calories">
      <input id="custom-protein" type="number" min="0" class="swal2-input" placeholder="Protein (g)">
      <input id="custom-carbs" type="number" min="0" class="swal2-input" placeholder="Carbs (g)">
      <input id="custom-fat" type="number" min="0" class="swal2-input" placeholder="Fat (g)">`,
    showCancelButton: true,
    confirmButtonText: 'Add to Food Log',
    confirmButtonColor: '#10b981',
    preConfirm: () => {
      let name = document.getElementById('custom-name').value.trim()
      if (!name) {
        Swal.showValidationMessage('Please enter a food name')
        return false
      }
      return {
        name,
        calories: Number(document.getElementById('custom-calories').value) || 0,
        protein: Number(document.getElementById('custom-protein').value) || 0,
        carbs: Number(document.getElementById('custom-carbs').value) || 0,
        fat: Number(document.getElementById('custom-fat').value) || 0
      }
    }
  })

  if (!result.isConfirmed) return
  let food = result.value
  app.foodLog.addItem({
    type: 'custom',
    name: food.name,
    thumbnail: '',
    servings: 1,
    nutrition: { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat },
    loggedAt: new Date().toISOString()
  })
  getDateFromLoocal()
})

getDateFromLoocal()

let today = getTodayKey()

function renderWeeklyOverview() {
  let weeklyChart = document.getElementById('weekly-chart')
  if (!weeklyChart) return

  let allLogs = app.foodLog.getAll()
  let todayDate = new Date()

  let daysHtml = ''

  for (let i = 6; i >= 0; i--) {
    let d = new Date()
    d.setDate(todayDate.getDate() - i)

    let year = d.getFullYear()
    let month = String(d.getMonth() + 1).padStart(2, '0')
    let day = String(d.getDate()).padStart(2, '0')
    let localKey = `${year}-${month}-${day}`
    let isoKey = d.toISOString().split('T')[0]

    let dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    let dayNum = d.getDate()

    let isToday = (i === 0)

    let dayData = allLogs[localKey] || allLogs[isoKey]
    let calories = dayData ? Number(dayData.totalCalories || 0) : 0
    let mealCount = dayData && dayData.meals ? dayData.meals.length : 0

    if (isToday) {
      daysHtml += `
        <div class="flex flex-col items-center justify-between p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center min-h-[145px]">
          <div>
            <span class="text-xs font-semibold text-gray-500">${dayName}</span>
            <p class="text-sm font-bold text-gray-900 mt-0.5">${dayNum}</p>
          </div>
          <div class="my-auto py-1">
            <p class="text-lg sm:text-xl font-bold ${calories > 0 ? 'text-emerald-600' : 'text-gray-300'}">${calories}</p>
            <p class="text-xs ${calories > 0 ? 'text-emerald-500 font-semibold' : 'text-gray-300'}">kcal</p>
          </div>
          <div class="min-h-[16px]">
            ${mealCount > 0 ? `<span class="text-xs text-gray-400 font-medium">${mealCount} items</span>` : ''}
          </div>
        </div>
      `
    } else {
      daysHtml += `
        <div class="flex flex-col items-center justify-between p-3 rounded-2xl text-center hover:bg-gray-50 transition-all min-h-[145px]">
          <div>
            <span class="text-xs font-medium text-gray-400">${dayName}</span>
            <p class="text-sm font-bold text-gray-800 mt-0.5">${dayNum}</p>
          </div>
          <div class="my-auto py-1">
            <p class="text-lg sm:text-xl font-bold ${calories > 0 ? 'text-emerald-600' : 'text-gray-300'}">${calories}</p>
            <p class="text-xs ${calories > 0 ? 'text-emerald-500 font-semibold' : 'text-gray-300'}">kcal</p>
          </div>
          <div class="min-h-[16px]">
            ${mealCount > 0 ? `<span class="text-xs text-gray-400 font-medium">${mealCount} Items</span>` : ''}
          </div>
        </div>
      `
    }
  }

  weeklyChart.className = "grid grid-cols-7 gap-2 items-stretch"
  weeklyChart.innerHTML = daysHtml
}

function getDateFromLoocal(){
  let data = app.foodLog.getAll()
  let today = getTodayKey()
  let todayData = data[today]
  let card = ``

  if (todayData && todayData.meals && todayData.meals.length > 0) {
    document.getElementById('EmptyState').classList.add('hidden')
    document.getElementById('clear-foodlog').style.display = 'inline-flex'
    let localData = todayData.meals
    for(let m in localData){
      let timestamp = localData[m].loggedAt
      let date = new Date(timestamp);

      let formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      card+=`
        <div class="w-full p-3 bg-gray-200 rounded-md hover:bg-gray-400 flex justify-between" meal-index="${m}" meal-logged="${localData[m].loggedAt}" meal-data="${localData[m].name}">
          <div class="flex">
          <div class="w-16 h-16 rounded-sm bg-white flex items-center justify-center overflow-hidden shrink-0">
            ${localData[m].thumbnail ? `<img src="${localData[m].thumbnail}" alt="${localData[m].name}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-utensils text-gray-300 text-xl"></i>`}
          </div>
          <div class="ms-3">
            <p class="font-bold">${localData[m].name}</p>
            <p>${localData[m].servings || 1} serving${Number(localData[m].servings || 1) === 1 ? '' : 's'} • <span class="text-green-600">${localData[m].type === 'product' ? 'Product' : localData[m].type === 'custom' ? 'Custom' : 'Recipe'}</span></p>
            <p>${formattedTime}</p>
          </div>
          </div>
          <div class="flex items-center justify-between w-[35%] p-2">
            <p><span class="text-green-500 font-bold">${localData[m].nutrition.calories}</span> kcal</p>
            <p>${localData[m].nutrition.protein}g P</p>
            <p class="bg-amber-100 rounded-sm p-1.5 ">${localData[m].nutrition.carbs} C</p>
            <p>${localData[m].nutrition.fat}g F</p>
            <i class="fa-solid fa-trash-can text-gray-500 cursor-pointer" id='delete'></i>
          </div>
        </div>
      `
    }
    
    let totalCal = todayData.meals.reduce((sum, m) => sum + (Number(m.nutrition?.calories) || 0), 0)
    let totalProtein = todayData.meals.reduce((sum, m) => sum + (Number(m.nutrition?.protein) || 0), 0)
    let totalCarbs = todayData.meals.reduce((sum, m) => sum + (Number(m.nutrition?.carbs) || 0), 0)
    let totalFat = todayData.meals.reduce((sum, m) => sum + (Number(m.nutrition?.fat) || 0), 0)

    todayData.totalCalories = totalCal
    todayData.totalProtein = totalProtein
    todayData.totalCarbs = totalCarbs
    todayData.totalFat = totalFat
    data[today] = todayData
    app.foodLog.saveAll(data)

    document.getElementById('caloriesSpan').innerHTML = `${totalCal} / 2000 kcal`
    if(`${calc(totalCal , 2000)}%` == '100%'){
      document.getElementById('caloriesBar').style.width = '100%'
      document.getElementById('caloriesBar').classList.add('bg-red-500')
    }else{
      document.getElementById('caloriesBar').style.width = `${calc(totalCal , 2000)}%`
      document.getElementById('caloriesBar').classList.remove('bg-red-500')
    }

    document.getElementById('proteinSpan').innerHTML = `${totalProtein} / 50 g`
    if(`${calc(totalProtein, 50)}%` == '100%'){
      document.getElementById('proteinBar').style.width = '100%'
      document.getElementById('proteinBar').classList.add('bg-red-500')
    }else{
      document.getElementById('proteinBar').style.width = `${calc(totalProtein, 50)}%`
      document.getElementById('proteinBar').classList.remove('bg-red-500')
    }

    document.getElementById('carbsSpan').innerHTML = `${totalCarbs} / 250 g`
    if(`${calc(totalCarbs, 250)}%` == '100%'){
      document.getElementById('carbsBar').style.width = '100%'
      document.getElementById('carbsBar').classList.add('bg-red-500')
    }else{
      document.getElementById('carbsBar').style.width = `${calc(totalCarbs, 250)}%`
      document.getElementById('carbsBar').classList.remove('bg-red-500')
    }

    document.getElementById('fatSpan').innerHTML = `${totalFat} / 65 g`
    if(`${calc(totalFat, 65)}%` == '100%'){
      document.getElementById('fatBar').style.width = '100%'
      document.getElementById('fatBar').classList.add('bg-red-500')
    }else{
      document.getElementById('fatBar').style.width = `${calc(totalFat, 65)}%`
      document.getElementById('fatBar').classList.remove('bg-red-500')
    }
  } else {
    document.getElementById('EmptyState').classList.remove('hidden')
    document.getElementById('clear-foodlog').style.display = 'none'
    document.getElementById('caloriesSpan').innerHTML = `0 / 2000 kcal`
    document.getElementById('caloriesBar').style.width = `0%`
    document.getElementById('proteinSpan').innerHTML = `0 / 50 g`
    document.getElementById('proteinBar').style.width = `0%`
    document.getElementById('carbsSpan').innerHTML = `0 / 250 g`
    document.getElementById('carbsBar').style.width = `0%`
    document.getElementById('fatSpan').innerHTML = `0 / 65 g`
    document.getElementById('fatBar').style.width = `0%`
  }

  document.getElementById('logged-items-list').innerHTML = card
  renderWeeklyOverview()
}
function calc(n1 , n2){
  if(n1 > n2){
    return "100"
  }else{
    return n1/n2*100
  }
}

let date = new Date(); 

let formatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',  
  month: 'short',  
  day: 'numeric'   
});

document.getElementById('foodlog-date').innerHTML = formatter.format(date)
document.getElementById('logged-items-list').addEventListener('click',function(e){
  let btn = e.target.closest('#delete')
  if(!btn) return
  let cardEl = btn.closest('[meal-index]') || btn.closest('[meal-logged]') || btn.closest('[meal-data]')
  if(!cardEl) return
  
  let index = cardEl.getAttribute('meal-index')
  let loggedAt = cardEl.getAttribute('meal-logged')
  let name = cardEl.getAttribute('meal-data')
  app.foodLog.removeItem(index, loggedAt, name)
  getDateFromLoocal()
})

let clearLogBtn = document.getElementById('clear-foodlog')
if (clearLogBtn) {
  clearLogBtn.addEventListener('click', () => {
    app.foodLog.clearDay()
    getDateFromLoocal()
  })
}
