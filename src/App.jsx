import React, { useState, useEffect } from 'react'
    import { createClient } from '@supabase/supabase-js'
    import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom'

    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_KEY
    )

    const App = () => {
      return (
        <Router>
          <Routes>
            <Route path="/" element={<ReservationPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Router>
      )
    }

    const ReservationPage = () => {
      const [showWelcome, setShowWelcome] = useState(true)
      const [adults, setAdults] = useState(1)
      const [participants, setParticipants] = useState([{ name: '', child: null }])
      const [phone, setPhone] = useState('')
      const [coupon, setCoupon] = useState('')
      const [discount, setDiscount] = useState(0)
      const [receipt, setReceipt] = useState(null)
      const [notification, setNotification] = useState(null)
      const [pixKey, setPixKey] = useState('')
      const [adultPrice, setAdultPrice] = useState(69.90)
      const [childPrice, setChildPrice] = useState({ '0-5': 0, '6-10': 0 })

      useEffect(() => {
        const fetchPrices = async () => {
          const { data, error } = await supabase
            .from('prices')
            .select('*')
            .single()

          if (error || !data) {
            return
          }

          setAdultPrice(data.adult || 69.90)
          setChildPrice({ '0-5': data['0-5'] || 0, '6-10': data['6-10'] || 0 })
        }

        fetchPrices()
      }, [])

      const showNotification = (message, type) => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3000)
      }

      const handleParticipantChange = (index, field, value) => {
        const newParticipants = [...participants]
        newParticipants[index][field] = value
        setParticipants(newParticipants)
      }

      const addParticipant = () => {
        setParticipants([...participants, { name: '', child: null }])
      }

      const handleCoupon = async () => {
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', coupon)
          .single()

        if (error || !data) {
          showNotification('Cupom inválido', 'error')
          return
        }

        setDiscount(data.discount)
        showNotification('Cupom aplicado com sucesso!', 'success')
      }

      const handleReceiptUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const { data, error } = await supabase.storage
          .from('receipts')
          .upload(`receipts/${Date.now()}_${file.name}`, file)

        if (error) {
          showNotification('Erro ao enviar comprovante', 'error')
          return
        }

        setReceipt(data.path)
        showNotification('Comprovante enviado com sucesso!', 'success')
      }

      const copyToClipboard = (text, message) => {
        navigator.clipboard.writeText(text)
        showNotification(message, 'success')
      }

      const handleSubmit = async (e) => {
        e.preventDefault()
        
        const { error } = await supabase
          .from('reservations')
          .insert([{
            adults,
            participants,
            phone,
            coupon,
            discount,
            receipt
          }])

        if (error) {
          showNotification('Erro ao finalizar reserva', 'error')
          return
        }

        showNotification('Reserva realizada com sucesso!', 'success')
      }

      const calculateTotal = () => {
        let total = adults * adultPrice
        participants.forEach(participant => {
          if (participant.child) {
            total += childPrice[participant.child] || 0
          }
        })
        return total.toFixed(2)
      }

      const isPriceZero = (price) => {
        return Math.abs(price) < 0.0001;
      }

      return (
        <div className="container">
          {showWelcome && (
            <div className="welcome-popup">
              <h2>Bem-vindo ao nosso restaurante!</h2>
              <p>Faça sua reserva agora mesmo.</p>
              <button 
                className="button"
                onClick={() => setShowWelcome(false)}
              >
                Fechar
              </button>
            </div>
          )}

          <div className="form-container">
            <h2 className="form-title">Fazer Reserva</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Número de Pessoas:</label>
                <input
                  type="number"
                  value={adults}
                  onChange={(e) => {
                    setAdults(Number(e.target.value))
                    const newParticipants = Array(Number(e.target.value)).fill(null).map((_, index) => participants[index] || { name: '', child: null })
                    setParticipants(newParticipants)
                  }}
                  min="1"
                />
              </div>
              {participants.map((participant, index) => (
                <div key={index} className="participant-group">
                  <div className="input-group">
                    <label>Nome do Responsável {index + 1}:</label>
                    <input
                      type="text"
                      value={participant.name}
                      onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                      placeholder={`Nome do Participante ${index + 1}`}
                    />
                  </div>
                  {index > 0 && (
                    <div className="child-options">
                      <label>
                        <input
                          type="radio"
                          name={`child-${index}`}
                          value="0-5"
                          checked={participant.child === '0-5'}
                          onChange={(e) => handleParticipantChange(index, 'child', e.target.value)}
                        />
                        Criança (até 5 anos) - R$ {isPriceZero(childPrice['0-5']) ? '0.00' : childPrice['0-5']?.toFixed(2)}
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`child-${index}`}
                          value="6-10"
                          checked={participant.child === '6-10'}
                          onChange={(e) => handleParticipantChange(index, 'child', e.target.value)}
                        />
                        Criança (6-10 anos) - R$ {isPriceZero(childPrice['6-10']) ? '0.00' : childPrice['6-10']?.toFixed(2)}
                      </label>
                    </div>
                  )}
                </div>
              ))}
              <div className="input-group">
                <label>Telefone:</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="coupon-section">
                <button
                  type="button"
                  className="coupon-button"
                  onClick={() => {}}
                >
                  Tem um cupom de desconto?
                </button>
              </div>
              <div className="restaurant-info">
                <p>
                  <strong>Local do Rodízio</strong><br />
                  Endereço: Rua Juiz David Barrilli, 376 - Jardim Aquarius, São José dos Campos - SP, 12246-200
                </p>
                <div className="button-group">
                  <button
                    type="button"
                    className="button small"
                    onClick={() => window.open('https://maps.google.com?q=Rua+Juiz+David+Barrilli,+376+-+Jardim+Aquarius,+S%C3%A3o+Jos%C3%A9+dos+Campos+-+SP,+12246-200')}
                  >
                    Abrir no Google Maps
                  </button>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => copyToClipboard('Rua Juiz David Barrilli, 376 - Jardim Aquarius, São José dos Campos - SP, 12246-200', 'Endereço copiado!')}
                  >
                    Copiar Endereço
                  </button>
                </div>
              </div>
              <div className="payment-info">
                <h2>Informações de Pagamento</h2>
                <p><strong>Valor Total: R$ {calculateTotal()}</strong></p>
                <p>Para finalizar sua reserva, siga os passos abaixo:</p>
                <div className="payment-steps">
                  <div className="payment-step">
                    <span className="step-number">1</span>
                    <p><strong>Realize o Pagamento via PIX</strong></p>
                    <div className="pix-key-section">
                      <label>Tipo de Chave: CPF</label>
                      <input
                        type="text"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="Insira a chave PIX"
                      />
                      <button
                        type="button"
                        className="button small"
                        onClick={() => copyToClipboard(pixKey, 'Chave PIX copiada!')}
                      >
                        Copiar
                      </button>
                    </div>
                    <div className="copy-pix-checkbox">
                      <input type="checkbox" id="copy-pix" />
                      <label htmlFor="copy-pix">Clique para copiar a chave PIX</label>
                    </div>
                  </div>
                  <div className="payment-step">
                    <span className="step-number">2</span>
                    <p><strong>Envie o Comprovante de Pagamento</strong></p>
                    <input
                      type="file"
                      onChange={handleReceiptUpload}
                      accept="image/*,.pdf"
                    />
                    <p className="file-formats">Formatos aceitos: imagens e PDF</p>
                  </div>
                </div>
              </div>
              <button type="submit" className="button primary">
                Finalizar Reserva
              </button>
              <Link to="/admin" className="admin-link">Ir para Admin</Link>
            </form>
          </div>

          {notification && (
            <div className={`notification ${notification.type}`}>
              {notification.message}
            </div>
          )}
        </div>
      )
    }

    const AdminPage = () => {
      const [adultPrice, setAdultPrice] = useState(69.90)
      const [childPrice, setChildPrice] = useState({ '0-5': 0, '6-10': 0 })
      const [notification, setNotification] = useState(null)
      const [activeSection, setActiveSection] = useState('general')

      useEffect(() => {
        const fetchPrices = async () => {
          const { data, error } = await supabase
            .from('prices')
            .select('*')
            .single()

          if (error || !data) {
            return
          }

          setAdultPrice(data.adult || 69.90)
          setChildPrice({ '0-5': data['0-5'] || 0, '6-10': data['6-10'] || 0 })
        }

        fetchPrices()
      }, [])

      const showNotification = (message, type) => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3000)
      }

      const handleSavePrices = async () => {
        try {
          const { data, error } = await supabase
            .from('prices')
            .upsert({
              id: 1,
              adult: adultPrice,
              '0-5': childPrice['0-5'],
              '6-10': childPrice['6-10']
            })

          if (error) {
            showNotification('Erro ao salvar preços', 'error')
            console.error('Erro ao salvar preços:', error)
            return
          }

          showNotification('Preços salvos com sucesso!', 'success')
          console.log('Preços salvos com sucesso!')
          if (data) {
            setAdultPrice(data.adult);
            setChildPrice({ '0-5': data['0-5'], '6-10': data['6-10'] });
          }
        } catch (error) {
          showNotification('Erro ao salvar preços', 'error')
          console.error('Erro ao salvar preços:', error)
        }
      }

      return (
        <div className="admin-container">
          <div className="admin-sidebar">
            <h2>Configurações</h2>
            <ul>
              <li><Link to="/">Voltar para Reserva</Link></li>
              <li onClick={() => setActiveSection('prices')}>
                <a href="#">Configurações de Preço</a>
              </li>
              <li><a href="#" onClick={() => setActiveSection('general')}>Geral</a></li>
              <li><a href="#" onClick={() => setActiveSection('users')}>Usuários</a></li>
              <li><a href="#" onClick={() => setActiveSection('reservations')}>Reservas</a></li>
            </ul>
          </div>
          <div className="admin-content">
            <h1>Painel de Administração</h1>
            {activeSection === 'prices' && (
              <div className="price-settings">
                <h2>Configurações de Preço</h2>
                <div className="input-group">
                  <label>Preço Adulto:</label>
                  <input
                    type="number"
                    value={adultPrice}
                    onChange={(e) => setAdultPrice(Number(e.target.value))}
                  />
                </div>
                <div className="input-group">
                  <label>Preço Criança (até 5 anos):</label>
                  <input
                    type="number"
                    value={childPrice['0-5']}
                    onChange={(e) => setChildPrice({ ...childPrice, '0-5': Number(e.target.value) })}
                  />
                </div>
                <div className="input-group">
                  <label>Preço Criança (6-10 anos):</label>
                  <input
                    type="number"
                    value={childPrice['6-10']}
                    onChange={(e) => setChildPrice({ ...childPrice, '6-10': Number(e.target.value) })}
                  />
                </div>
                <button className="button primary" onClick={handleSavePrices}>Salvar Preços</button>
              </div>
            )}
            {activeSection === 'general' && (
              <p>Configurações gerais do sistema.</p>
            )}
            {activeSection === 'users' && (
              <p>Gerenciamento de usuários.</p>
            )}
            {activeSection === 'reservations' && (
              <p>Gerenciamento de reservas.</p>
            )}
          </div>
          {notification && (
            <div className={`notification ${notification.type}`}>
              {notification.message}
            </div>
          )}
        </div>
      )
    }

    export default App
