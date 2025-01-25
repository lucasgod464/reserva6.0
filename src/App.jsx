import React, { useState, useEffect } from 'react'
    import { createClient } from '@supabase/supabase-js'
    import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom'
    import config from './config'
    import WelcomePopup from './components/WelcomePopup'

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
      const [adults, setAdults] = useState(1)
      const [participants, setParticipants] = useState([{ name: '', child: null }])
      const [phone, setPhone] = useState('')
      const [coupon, setCoupon] = useState('')
      const [discount, setDiscount] = useState(0)
      const [receipt, setReceipt] = useState(null)
      const [notification, setNotification] = useState(null)
      const [pixKey, setPixKey] = useState('')
      const [adultPrice, setAdultPrice] = useState(69.90)
      const [childPrice, setChildPrice] = useState({ '0-5': 0, '6-10': 45 })
      const [restaurantAddress, setRestaurantAddress] = useState('')
      const [reservationTitle, setReservationTitle] = useState('Fazer Reserva')
      const [locationTitle, setLocationTitle] = useState('Local do Rodízio')
      const [popupTitle, setPopupTitle] = useState('Bem-vindo ao nosso restaurante!')
      const [popupDescription, setPopupDescription] = useState('Faça sua reserva agora mesmo.')
      const [showPopup, setShowPopup] = useState(true)
      const [total, setTotal] = useState(0);
      const [paymentPixKey, setPaymentPixKey] = useState('');
      const [paymentPixType, setPaymentPixType] = useState('CPF');
      const [comprovante, setComprovante] = useState(null);
      const [showCouponInput, setShowCouponInput] = useState(false);

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
          setChildPrice({ '0-5': data['0-5'] || 0, '6-10': data['6-10'] || 45 })
          setLocationTitle(data.locationTitle || 'Local do Rodízio')
          setReservationTitle(data.reservationTitle || 'Fazer Reserva')
        }

        const fetchAddress = async () => {
          try {
            const { data, error } = await supabase
              .from('addresses')
              .select('address')
              .single();

            if (error) {
              console.error("Erro ao buscar endereço:", error);
              setNotification("Erro ao carregar endereço do restaurante.", "error");
              return;
            }

            setRestaurantAddress(data?.address || '');
          } catch (error) {
            console.error("Erro ao buscar endereço:", error);
            setNotification("Erro ao carregar endereço do restaurante.", "error");
          }
        };

        const fetchPopupSettings = async () => {
          try {
            const { data, error } = await supabase
              .from('popup_settings')
              .select('*')
              .single();

            if (error) {
              console.error("Erro ao buscar configurações do popup:", error);
              return;
            }

            setPopupTitle(data?.title || 'Bem-vindo ao nosso restaurante!');
            setPopupDescription(data?.description || 'Faça sua reserva agora mesmo.');
            setShowPopup(data?.show === undefined ? true : data.show);
          } catch (error) {
            console.error("Erro ao buscar configurações do popup:", error);
          }
        };

        const fetchPaymentSettings = async () => {
          try {
            const { data, error } = await supabase
              .from('payment_settings')
              .select('*')
              .single();

            if (error) {
              console.error("Erro ao buscar configurações de pagamento:", error);
              return;
            }

            setPaymentPixKey(data?.pix_key || '');
            setPaymentPixType(data?.pix_type || 'CPF');
          } catch (error) {
            console.error("Erro ao buscar configurações de pagamento:", error);
          }
        };

        fetchPrices();
        fetchAddress();
        fetchPopupSettings();
        fetchPaymentSettings();
      }, []);

      useEffect(() => {
        calculateTotal();
      }, [adults, participants, adultPrice, childPrice]);

      const showNotification = (message, type) => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3000)
      }

      const handleParticipantChange = (index, field, value) => {
        const newParticipants = [...participants]
        newParticipants[index][field] = value
        setParticipants(newParticipants)
        calculateTotal();
      }

      const addParticipant = () => {
        setParticipants([...participants, { name: '', child: null }])
        calculateTotal();
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
        const file = e.target.files[0];
        if (!file) return;
        setComprovante(file);
      };

      const copyToClipboard = (text, message) => {
        navigator.clipboard.writeText(text)
        showNotification(message, 'success')
      }

      const handleSubmit = async (e) => {
        e.preventDefault()
        
        let comprovanteNome = null;
        let receiptPath = null;

        if (comprovante) {
          const extensao = comprovante.name.split('.').pop();
          comprovanteNome = `comprovante_${Date.now()}.${extensao}`;

          try {
            const { data, error: uploadError } = await supabase
              .storage
              .from('receipts')
              .upload(comprovanteNome, comprovante, {
                cacheControl: '3600',
                upsert: true
              });

            if (uploadError) {
              showNotification('Erro ao enviar comprovante', 'error');
              console.error('Erro ao enviar comprovante:', uploadError);
              return;
            }
            receiptPath = data.path;
          } catch (uploadError) {
            showNotification('Erro ao enviar comprovante', 'error');
            console.error('Erro ao enviar comprovante:', uploadError);
            return;
          }
        }
        
        const { error } = await supabase
          .from('reservations')
          .insert([{
            adults,
            participants,
            phone,
            coupon,
            discount,
            receipt: receiptPath
          }])

        if (error) {
          showNotification('Erro ao finalizar reserva', 'error')
          return
        }

        showNotification('Reserva realizada com sucesso!', 'success')
      }

      const calculateTotal = () => {
        let totalValue = 0;
        
        // Calculate the total for adults
        totalValue += adults * adultPrice;

        // Calculate the total for children
        participants.forEach(participant => {
          if (participant.child === '0-5') {
            totalValue -= adultPrice;
            totalValue += childPrice['0-5'] || 0;
          } else if (participant.child === '6-10') {
            totalValue -= adultPrice;
            totalValue += childPrice['6-10'] || 0;
          }
        });

        setTotal(totalValue.toFixed(2));
      };

      const handleChildCheckboxChange = (index, value) => {
        setParticipants(prevParticipants => {
          const newParticipants = [...prevParticipants];
          
          // If a checkbox is checked, uncheck the other one
          if (value === '0-5') {
            newParticipants[index] = { ...newParticipants[index], child: newParticipants[index].child === '0-5' ? null : '0-5' };
          } else if (value === '6-10') {
            newParticipants[index] = { ...newParticipants[index], child: newParticipants[index].child === '6-10' ? null : '6-10' };
          } else {
            newParticipants[index] = { ...newParticipants[index], child: null };
          }
          
          return newParticipants;
        });
      };

      return (
        <div className="container">
          <WelcomePopup
            title={popupTitle}
            description={popupDescription}
            show={showPopup}
            onClose={() => setShowPopup(false)}
          />

          <div className="form-container">
            <h2 className="form-title">{reservationTitle}</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Número de Pessoas:</label>
                <input
                  type="number"
                  value={adults}
                  onChange={(e) => {
                    setAdults(parseInt(e.target.value, 10));
                    const newParticipants = Array(parseInt(e.target.value, 10)).fill(null).map((_, index) => participants[index] || { name: '', child: null });
                    setParticipants(newParticipants);
                  }}
                  min="1"
                />
              </div>
              {participants.map((participant, index) => (
                <div key={index} className="participant-group">
                  <label>{index === 0 ? 'Nome do Responsável 1:' : `Reserva ${index + 1}:`}</label>
                  <div>
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
                          type="checkbox"
                          name={`child-${index}-0-5`}
                          value="0-5"
                          checked={participant.child === '0-5'}
                          onChange={(e) => handleChildCheckboxChange(index, '0-5')}
                        />
                        Criança (até 5 anos) - R$ {childPrice['0-5']?.toFixed(2)}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          name={`child-${index}-6-10`}
                          value="6-10"
                          checked={participant.child === '6-10'}
                          onChange={(e) => handleChildCheckboxChange(index, '6-10')}
                        />
                        Criança (6-10 anos) - R$ {childPrice['6-10']?.toFixed(2)}
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
                {!showCouponInput ? (
                  <button
                    type="button"
                    className="coupon-button"
                    onClick={() => setShowCouponInput(true)}
                  >
                    Tem um cupom de desconto?
                  </button>
                ) : (
                  <div className="coupon-input-group">
                    <input
                      type="text"
                      placeholder="Digite seu cupom"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                    />
                    <button
                      type="button"
                      className="button"
                      onClick={handleCoupon}
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
              <div className="restaurant-info">
                <p>
                  <strong>{locationTitle}</strong><br />
                  Endereço: {restaurantAddress}
                </p>
                <div className="button-group">
                  <button
                    type="button"
                    className="button small"
                    onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(restaurantAddress)}`)}
                  >
                    Abrir no Google Maps
                  </button>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => copyToClipboard(restaurantAddress, 'Endereço copiado!')}
                  >
                    Copiar Endereço
                  </button>
                </div>
              </div>
              <div className="payment-info">
                <h2>Informações de Pagamento</h2>
                <p><strong>Valor Total: R$ {total}</strong></p>
                <p>Para finalizar sua reserva, siga os passos abaixo:</p>
                <div className="payment-steps">
                  <div className="payment-step">
                    <span className="step-number">1</span>
                    <p><strong>Realize o Pagamento via PIX</strong></p>
                    <div className="pix-key-section">
                      <label>Tipo de Chave: {paymentPixType}</label>
                      <input
                        type="text"
                        value={paymentPixKey}
                        onChange={(e) => setPaymentPixKey(e.target.value)}
                        placeholder="Insira a chave PIX"
                      />
                      <button
                        type="button"
                        className="button small"
                        onClick={() => copyToClipboard(paymentPixKey, 'Chave PIX copiada!')}
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
      // ... (rest of AdminPage component remains the same)
    }

    const handleChildCheckboxChange = (index, value) => {
      setParticipants(prevParticipants => {
        const newParticipants = [...prevParticipants];
        
        // If a checkbox is checked, uncheck the other one
        if (value === '0-5') {
          newParticipants[index] = { ...newParticipants[index], child: newParticipants[index].child === '0-5' ? null : '0-5' };
        } else if (value === '6-10') {
          newParticipants[index] = { ...newParticipants[index], child: newParticipants[index].child === '6-10' ? null : '6-10' };
        } else {
          newParticipants[index] = { ...newParticipants[index], child: null };
        }
        
        return newParticipants;
      });
    };

    export default App
