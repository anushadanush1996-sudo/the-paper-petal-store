
import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

const starterProducts = [
  {
    id: 1,
    name: 'Handmade Rose Bouquet',
    price: 499,
    stock: 5,
    category: 'Flowers',
    image: 'https://images.unsplash.com/photo-1494972308805-463bc619d34e?w=600',
  },
  {
    id: 2,
    name: 'Personalised Gift Box',
    price: 699,
    stock: 3,
    category: 'Gift Boxes',
    image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=600',
  },
  {
    id: 3,
    name: 'Handmade Greeting Card',
    price: 199,
    stock: 8,
    category: 'Paper Crafts',
    image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?w=600',
  },
  {
    id: 4,
    name: 'Special Gift Bouquet',
    price: 599,
    stock: 4,
    category: 'Custom Gifts',
    image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600',
  },
]

function App() {
  const [products, setProducts] = useState([])

const [cart, setCart] = useState(() => {
  try {
    const savedCart = localStorage.getItem('craftCart')
    return savedCart ? JSON.parse(savedCart) : []
  } catch {
    return []
  }
})
  const [searchTerm, setSearchTerm] = useState('')
const [selectedCategory, setSelectedCategory] = useState('All')
const [sortOrder, setSortOrder] = useState('default')
  const [cartMessage, setCartMessage] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [session, setSession] = useState(null)
const [adminEmail, setAdminEmail] = useState('')
const [adminPassword, setAdminPassword] = useState('')
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
  })

  const { data: { subscription } } =
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

  return () => subscription.unsubscribe()
}, [])
useEffect(() => {
  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error loading products:', error.message)
      alert('Could not load products: ' + error.message)
      return
    }

    setProducts(data || [])
  }

  loadProducts()
}, [])
  const [editingProductId, setEditingProductId] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
  })

 
const [newProduct, setNewProduct] = useState({
  name: '',
  category: 'Flowers',
  description: '',
  price: '',
  stock: '',
  image: ''
})


  const whatsappNumber = '918825506532'

 
  useEffect(() => {
  localStorage.setItem('craftCart', JSON.stringify(cart))
}, [cart])
  useEffect(() => {
  if (!cartMessage) return

  const timer = setTimeout(() => {
    setCartMessage('')
  }, 3000)

  return () => clearTimeout(timer)
}, [cartMessage])

  async function handleAdminLogin(e) {
  e.preventDefault()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  })

  if (error) {
    alert('Login failed: ' + error.message)
    return
  }

  setSession(data.session)
  setAdminPassword('')
  setShowAdmin(true)

  alert('Welcome to The Paper Petal Admin Dashboard!')
}

async function handleAdminLogout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    alert(error.message)
    return
  }

  setShowAdmin(false)
  setSession(null)
  alert('You have logged out successfully.')
}

function addToCart(product) {
  const current = cart.find(item => item.id === product.id)
  const quantity = current ? current.quantity : 0

  if (quantity >= product.stock) {
    alert('Sorry! Only ' + product.stock + ' items are available.')
    return
  }

  setCart(currentCart => {
    if (current) {
      return currentCart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    }

    return [...currentCart, { ...product, quantity: 1 }]
  })

  setCartMessage('✓ ' + product.name + ' added to your cart!')
}

  function changeQuantity(id, amount) {
    const product = products.find(item => item.id === id)

    setCart(currentCart =>
      currentCart
        .map(item => {
          if (item.id !== id) return item

          const nextQuantity = item.quantity + amount

          if (nextQuantity > product.stock) {
            alert('Only ' + product.stock + ' items are available.')
            return item
          }

          return { ...item, quantity: nextQuantity }
        })
        .filter(item => item.quantity > 0)
    )
  }


async function handleImageUpload(e) {
  const file = e.target.files[0]

  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Please select an image smaller than 5 MB.')
    return
  }

  const reader = new FileReader()

  reader.onload = () => {
    const img = new Image()

    img.onload = async () => {
      const canvas = document.createElement('canvas')
      const maxSize = 1000

      const scale = Math.min(
        maxSize / img.width,
        maxSize / img.height,
        1
      )

      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Could not compress this image.')
          return
        }

        const filePath = `${Date.now()}.jpg`

        const { error } = await supabase.storage
          .from('product-images')
          .upload(filePath, blob, {
            contentType: 'image/jpeg'
          })

        if (error) {
          alert('Image upload failed: ' + error.message)
          return
        }

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        setNewProduct(current => ({
          ...current,
          image: data.publicUrl
        }))

        alert('Image uploaded successfully!')
      }, 'image/jpeg', 0.75)
    }

    img.onerror = () => alert('Could not process this image.')
    img.src = reader.result
  }

  reader.onerror = () => alert('Could not read this image.')
  reader.readAsDataURL(file)
}




  
async function addProduct(e) {
  e.preventDefault()

  const product = {
    name: newProduct.name,
    category: newProduct.category,
    description: newProduct.description,
    price: Number(newProduct.price),
    stock: Number(newProduct.stock),
    image: newProduct.image
  }

  let error

  if (editingProductId !== null) {
    const result = await supabase
      .from('products')
      .update(product)
      .eq('id', editingProductId)

    error = result.error
  } else {
    const result = await supabase
      .from('products')
      .insert([product])

    error = result.error
  }

  if (error) {
    alert('Could not save product: ' + error.message)
    return
  }

  const { data, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true })

  if (fetchError) {
    alert('Product saved, but refresh failed: ' + fetchError.message)
    return
  }

  setProducts(data || [])

  setNewProduct({
    name: '',
    category: 'Flowers',
    description: '',
    price: '',
    stock: '',
    image: ''
  })

  setEditingProductId(null)

  alert(editingProductId !== null
    ? 'Product updated successfully!'
    : 'New product added successfully!')
}
function startEditingProduct(product) {
  setNewProduct({
    name: product.name,
    category: product.category,
    description: product.description || '',
    price: String(product.price),
    stock: String(product.stock),
    image: product.image || ''
  })

  setEditingProductId(product.id)

  document.querySelector('.admin-form')?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  })
}

  async function updateStock(id, amount) {
  const product = products.find(item => item.id === id)

  if (!product) return

  const newStock = Math.max(0, product.stock + amount)

  const { error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', id)

  if (error) {
    alert('Could not update stock: ' + error.message)
    return
  }

  setProducts(current =>
    current.map(item =>
      item.id === id ? { ...item, stock: newStock } : item
    )
  )
}

async function updatePrice(id, value) {
  const price = Number(value)

  if (value === '' || price <= 0) return

  const { error } = await supabase
    .from('products')
    .update({ price })
    .eq('id', id)

  if (error) {
    alert('Could not update price: ' + error.message)
    return
  }

  setProducts(current =>
    current.map(item =>
      item.id === id ? { ...item, price } : item
    )
  )
}

async function removeProduct(id) {
  if (!window.confirm('Are you sure you want to remove this product?')) {
    return
  }

  const product = products.find(item => item.id === id)

  if (!product) return

  // Delete the product from the database
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    alert('Could not remove product: ' + error.message)
    return
  }

  // Delete its image from Supabase Storage, if it belongs to our bucket
  if (product.image) {
    try {
      const imageUrl = new URL(product.image)
      const marker = '/storage/v1/object/public/product-images/'
      const imageIndex = imageUrl.pathname.indexOf(marker)

      if (imageIndex !== -1) {
        const filePath = decodeURIComponent(
          imageUrl.pathname.slice(imageIndex + marker.length)
        )

        const { error: imageError } = await supabase.storage
          .from('product-images')
          .remove([filePath])

        if (imageError) {
          console.error('Image deletion failed:', imageError.message)
          alert('Product removed, but its image could not be deleted.')
        }
      }
    } catch (error) {
      console.error('Could not process product image:', error)
    }
  }

  setProducts(current => current.filter(item => item.id !== id))
  setCart(current => current.filter(item => item.id !== id))
}


  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity, 0
  )

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  )
  const filteredProducts = products
  .filter(product => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    const matchesCategory =
      selectedCategory === 'All' ||
      product.category === selectedCategory

    return matchesSearch && matchesCategory
  })
  .sort((a, b) => {
    if (sortOrder === 'low-high') {
      return a.price - b.price
    }

    if (sortOrder === 'high-low') {
      return b.price - a.price
    }

    return 0
  })

  function handleCheckout(e) {
    e.preventDefault()

    if (cart.length === 0) return

    const orderDetails = cart.map(item =>
      `${item.name} x ${item.quantity} = ₹${item.price * item.quantity}`
    ).join('\n')

    const message = `
Hello! I would like to place an order.

Customer: ${customer.name}
Phone: ${customer.phone}
Address: ${customer.address}

ORDER DETAILS:
${orderDetails}

Total: ₹${total}

Please confirm my order. Thank you!
    `

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
  }

  return (
    <div className="store">
      {cartMessage && (
  <div className="cart-toast">
    {cartMessage}
    <button onClick={() => setCartMessage('')}>×</button>
  </div>
)}

      <header className="navbar">
        <h2 className="logo">The Paper Petal<span>.</span></h2>

        <nav>
          <a href="#home">Home</a>
          <a href="#shop">Shop</a>
          <a href="#about">Our Story</a>
          <a href="#contact">Contact</a>
        </nav>

        <a href="#cart" className="cart">
          🛍️ Cart ({cartCount})
        </a>
      </header>

      <section className="hero" id="home">
        <div className="hero-content">
          <p className="eyebrow">MADE WITH LOVE, CREATED FOR YOU</p>
          <h1>Little things.<br />Big feelings.</h1>
          <p>
            Discover beautiful handmade creations,
            personalised gifts and crafts made with love.
          </p>
          <a href="#shop" className="shop-button">
            Explore Our Collection →
          </a>
        </div>
      </section>

      <section className="products-section" id="shop">
        <p className="eyebrow">A LITTLE BIT OF MAGIC</p>
        <h2>Our Handmade Collection</h2>
        <p className="subtitle">
          Thoughtfully made, beautifully gifted.
        </p>
<div className="shop-controls">

  <input
    type="text"
    placeholder="🔍 Search for handmade products..."
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
  />

  <div className="category-filters">
    <select
  className="sort-dropdown"
  value={sortOrder}
  onChange={e => setSortOrder(e.target.value)}
>
  <option value="default">Sort by: Default</option>
  <option value="low-high">Price: Low to High</option>
  <option value="high-low">Price: High to Low</option>
</select>
    {['All', 'Flowers', 'Gift Boxes', 'Paper Crafts', 'Custom Gifts', 'Home Decorations'].map(category => (
      <button
        key={category}
        className={selectedCategory === category ? 'active-category' : ''}
        onClick={() => setSelectedCategory(category)}
      >
        {category}
      </button>
    ))}
  </div>
<button
  className="clear-filters"
  onClick={() => {
    setSearchTerm('')
    setSelectedCategory('All')
    setSortOrder('default')
  }}
>
  Clear Filters
</button>
</div>
        <div className="product-grid">
          {filteredProducts.length > 0 ? (
  filteredProducts.map(product => (
            <div className="product-card" key={product.id}>
              <img src={product.image} alt={product.name} />

              <div className="product-info">
                <p className="category">{product.category}</p>
                <h3>{product.name}</h3>
                <p className="price">₹{product.price}</p>
                <p className="product-description">
  {product.description}
</p>
                <p className={`stock-status ${
  product.stock > 0 ? 'in-stock' : 'sold-out'
}`}>
  {product.stock > 0 ? 'In Stock' : 'Sold Out'}
</p>
                <p className="stock-label">
                  {product.stock > 0
                    ? `${product.stock} available`
                    : 'Currently unavailable'}
                </p>

               <button
  className="view-details-button"
  onClick={() => setSelectedProduct(product)}
>
  View Details
</button>

<button
  disabled={product.stock === 0}
  onClick={() => addToCart(product)}
>
  {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
</button>
              </div>
            </div>
                   ))
        ) : (
          <p className="no-products">
            No products found. Try another search or category.
          </p>
        )}
        </div>
      </section>
      {selectedProduct && (
       <div
  className="product-modal"
  onClick={() => setSelectedProduct(null)}
>
         <div
  className="product-modal-content"
  onClick={e => e.stopPropagation()}
>

            <button
              className="close-modal"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>

            <img
              src={selectedProduct.image}
              alt={selectedProduct.name}
            />

            <p className="category">
              {selectedProduct.category}
            </p>

            <h2>{selectedProduct.name}</h2>

            <p className="product-description">
              {selectedProduct.description || 'A beautiful handmade creation made with love.'}
            </p>

            <h3>₹{selectedProduct.price}</h3>

            <p>
              {selectedProduct.stock > 0
                ? `${selectedProduct.stock} available`
                : 'Sold Out'}
            </p>

            <button
              disabled={selectedProduct.stock === 0}
              onClick={() => {
                addToCart(selectedProduct)
              }}
            >
              {selectedProduct.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>

          </div>
        </div>
      )}
      <section className="shopping-cart" id="cart">
        <p className="eyebrow">YOUR SELECTION</p>
        <h2>My Shopping Cart 🛍️</h2>
      

        {cart.length === 0 ? (
          <p className="empty-cart">
            Your cart is empty. Let's find something beautiful!
          </p>
        ) : (
          <>
            {cart.map(item => (
              <div className="cart-item" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>₹{item.price} each</p>
                </div>

                <div className="quantity">
                  <button onClick={() => changeQuantity(item.id, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => changeQuantity(item.id, 1)}>+</button>
                </div>
<button
  className="remove-button"
  onClick={() =>
    setCart(current =>
      current.filter(cartItem => cartItem.id !== item.id)
    )
  }
>
  Remove
</button>
                <strong>₹{item.price * item.quantity}</strong>
              </div>
            ))}

            <div className="cart-total">
              <h3>Total: ₹{total}</h3>
              <p>{cartCount} item(s) in your cart</p>
            </div>
          </>
        )}
      </section>

      <section className="checkout" id="checkout">
        <p className="eyebrow">ALMOST YOURS</p>
        <h2>Complete Your Order</h2>
        <p>Tell us where to deliver your handmade goodies!</p>

        <form onSubmit={handleCheckout}>
          <input
            type="text"
            placeholder="Your full name"
            value={customer.name}
            onChange={e => setCustomer({...customer, name: e.target.value})}
            required
          />

          <input
            type="tel"
            placeholder="Your 10-digit mobile number"
            pattern="[0-9]{10}"
            maxLength="10"
            value={customer.phone}
            onChange={e => setCustomer({...customer, phone: e.target.value})}
            required
          />

          <textarea
            placeholder="Your complete delivery address"
            value={customer.address}
            onChange={e => setCustomer({...customer, address: e.target.value})}
            required
          />

          <button type="submit" disabled={cart.length === 0}>
            Place My Order on WhatsApp
          </button>
        </form>
      </section>

      <section className="about" id="about">
        <h2>Every creation tells a story.</h2>
        <p>
          We believe handmade gifts carry something special.
          Every little detail is created with creativity,
          patience and lots of love.
        </p>
      </section>

      <footer id="contact">
        <h2>The Paper Petal.</h2>
        <p>Made with love. Crafted with care. ♡</p>
        <p>© 2026 The Paper Petal. All rights reserved.</p>
      </footer>

      
<section className="admin-section">
  {!session ? (
    <form className="admin-login-form" onSubmit={handleAdminLogin}>
      <h2>Admin Login</h2>
      <p>Welcome to The Paper Petal Store Manager</p>

      <input
        type="email"
        placeholder="Admin email address"
        value={adminEmail}
        onChange={e => setAdminEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Admin password"
        value={adminPassword}
        onChange={e => setAdminPassword(e.target.value)}
        required
      />

      <button type="submit">Login to Dashboard</button>
    </form>
  ) : (
    <>
      <button
        className="admin-toggle"
        onClick={() => setShowAdmin(!showAdmin)}
      >
        {showAdmin ? 'Close Store Manager' : '⚙️ Manage My Products'}
      </button>

      <button onClick={handleAdminLogout}>
        Logout
      </button>
    </>
  )}

  {session && showAdmin && (
    <div className="admin-panel">
      <p className="eyebrow">YOUR STORE DASHBOARD</p>
      <h2>Product Management</h2>

      <form onSubmit={addProduct} className="admin-form">
        <label className="upload-label">
          Upload Product Photograph
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            required={!newProduct.image}
          />
        </label>

        {newProduct.image && (
          <div className="image-preview">
            <p>Photo Preview:</p>
            <img src={newProduct.image} alt="Product preview" />
          </div>
        )}

        <input
          type="text"
          placeholder="Product name"
          value={newProduct.name}
          onChange={e => setNewProduct({...newProduct, name: e.target.value})}
          required
        />

        <textarea
          placeholder="Write a short product description"
          value={newProduct.description}
          onChange={e => setNewProduct({...newProduct, description: e.target.value})}
        />

        <select
          value={newProduct.category}
          onChange={e => setNewProduct({...newProduct, category: e.target.value})}
        >
          <option>Flowers</option>
          <option>Gift Boxes</option>
          <option>Paper Crafts</option>
          <option>Custom Gifts</option>
          <option>Home Decorations</option>
        </select>

        <input
          type="number"
          min="1"
          placeholder="Selling price in ₹"
          value={newProduct.price}
          onChange={e => setNewProduct({...newProduct, price: e.target.value})}
          required
        />

        <input
          type="number"
          min="0"
          placeholder="Available stock"
          value={newProduct.stock}
          onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
          required
        />

        <button type="submit">
          {editingProductId !== null ? '✓ Update Product' : '+ Add New Product'}
        </button>

        {editingProductId !== null && (
          <button
            type="button"
            onClick={() => {
              setEditingProductId(null)
              setNewProduct({
                name: '',
                category: 'Flowers',
                description: '',
                price: '',
                stock: '',
                image: ''
              })
            }}
          >
            Cancel Editing
          </button>
        )}
      </form>

      <h3 className="inventory-heading">Your Inventory</h3>

      {products.map(product => (
        <div className="inventory-item" key={product.id}>
          <div className="inventory-details">
            <strong>{product.name}</strong>
            <p>₹{product.price} | Stock: {product.stock}</p>
          </div>

          <div className="inventory-actions">
            <button onClick={() => startEditingProduct(product)}>Edit</button>
            <button onClick={() => updateStock(product.id, -1)}>−</button>
            <button onClick={() => updateStock(product.id, 1)}>+</button>
            <button onClick={() => removeProduct(product.id)}>Remove</button>
          </div>

          <label className="price-editor">
            Change price:
            <input
              type="number"
              min="1"
              value={product.price}
              onChange={e => updatePrice(product.id, e.target.value)}
            />
          </label>
        </div>
      ))}
    </div>
  )}
</section>


    </div>
  )
}

export default App
