'use client'
import { useState, useEffect } from 'react'
import { useActiveAccount } from '@/components/trading/AccountContext'
import styles from './page.module.css'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

const currentRealYear = new Date().getFullYear()
const years = [currentRealYear - 1, currentRealYear, currentRealYear + 1]

export default function CalendarioPage() {
  const { activeAccount, isLoaded } = useActiveAccount()
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [dailyData, setDailyData] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    if (!isLoaded || !activeAccount) return
    fetch(`/api/trading/calendario?accountId=${activeAccount.id}&year=${currentYear}&month=${currentMonth}`)
      .then(r => r.json())
      .then(data => setDailyData(data.dailyData || []))
  }, [activeAccount, isLoaded, currentYear, currentMonth])

  const getDayData = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return dailyData.find(d => d.date === dateStr) || null
  }
  const getDaysInMonth = () => new Date(currentYear, currentMonth, 0).getDate()
  const getFirstDay = () => { let d = new Date(currentYear, currentMonth-1, 1).getDay(); return d === 0 ? 6 : d-1 }
  const prevMonth = () => { if (currentMonth===1){setCurrentMonth(12);setCurrentYear(y=>y-1)}else setCurrentMonth(m=>m-1) }
  const nextMonth = () => { if (currentMonth===12){setCurrentMonth(1);setCurrentYear(y=>y+1)}else setCurrentMonth(m=>m+1) }

  const totalPnl = dailyData.reduce((s,d) => s+(d.totalPnl||0), 0)
  const winDays = dailyData.filter(d => d.totalPnl > 0).length
  const lossDays = dailyData.filter(d => d.totalPnl < 0).length
  const totalOps = dailyData.reduce((s,d) => s+(d.totalOps||0), 0)

  if (!isLoaded) return null

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Calendario</h1>
        <p className={styles.subtitle}>Rendimiento diario — {activeAccount?.name}</p>
      </header>

      <div className={styles.summary}>
        <div className={styles.sc} style={{borderTopColor:'#1D9E75'}}>
          <div className={styles.scLbl}>PNL DEL MES</div>
          <div className={styles.scVal} style={{color: totalPnl>=0?'#1D9E75':'#E24B4A'}}>{totalPnl>=0?'+':''}${totalPnl.toFixed(2)}</div>
        </div>
        <div className={styles.sc} style={{borderTopColor:'#1D9E75'}}>
          <div className={styles.scLbl}>DÍAS GANADORES</div>
          <div className={styles.scVal} style={{color:'#1D9E75'}}>{winDays}</div>
        </div>
        <div className={styles.sc} style={{borderTopColor:'#E24B4A'}}>
          <div className={styles.scLbl}>DÍAS PERDEDORES</div>
          <div className={styles.scVal} style={{color:'#E24B4A'}}>{lossDays}</div>
        </div>
        <div className={styles.sc} style={{borderTopColor:'#9FE1CB'}}>
          <div className={styles.scLbl}>TOTAL OPERACIONES</div>
          <div className={styles.scVal}>{totalOps}</div>
        </div>
      </div>

      <div className={styles.cal}>
        <div className={styles.calHeader}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <button type="button" onClick={prevMonth} className={styles.navBtn}>‹</button>
            <h2 className={styles.monthTitle}>{MONTHS[currentMonth-1]} {currentYear}</h2>
            <button type="button" onClick={nextMonth} className={styles.navBtn}>›</button>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:'8px', alignItems:'flex-end'}}>
            <div className={styles.filterRow}>
              <select className={styles.yearSelect} value={currentYear} onChange={e => setCurrentYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className={styles.filterRow}>
              {MONTHS_SHORT.map((m, i) => (
                <button key={i} type="button"
                  className={`${styles.filterBtn} ${currentMonth === i+1 ? styles.active : ''}`}
                  onClick={() => setCurrentMonth(i+1)}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.dayLabels}>{DAYS.map(d=><div key={d} className={styles.dl}>{d}</div>)}</div>

        <div className={styles.grid}>
          {Array(getFirstDay()).fill(null).map((_,i)=><div key={'e'+i} className={styles.empty}/>)}
          {Array(getDaysInMonth()).fill(null).map((_,i)=>{
            const day = i+1
            const data = getDayData(day)
            const isToday = day===today.getDate() && currentMonth===today.getMonth()+1 && currentYear===today.getFullYear()
            const isSel = selectedDay===day
            return (
              <div key={day}
                className={`${styles.day} ${data?(data.totalPnl>0?styles.win:data.totalPnl<0?styles.loss:styles.be):''} ${isToday?styles.today:''} ${isSel?styles.sel:''}`}
                onClick={()=>setSelectedDay(isSel?null:day)}>
                <div className={styles.dn}>{day}</div>
                {data && <>
                  <div className={styles.dpnl} style={{color:data.totalPnl>=0?'#1D9E75':'#E24B4A'}}>{data.totalPnl>=0?'+':''}${Math.abs(data.totalPnl).toFixed(0)}</div>
                  <div className={styles.dops}>{data.totalOps} op{data.totalOps>1?'s':''}</div>
                </>}
              </div>
            )
          })}
        </div>

        {selectedDay && getDayData(selectedDay) && (
          <div className={styles.detail}>
            <h3 className={styles.detailTitle}>{selectedDay} de {MONTHS[currentMonth-1]}</h3>
            <div className={styles.detailGrid}>
              <div><span className={styles.dlbl}>OPERACIONES</span><span className={styles.dval}>{getDayData(selectedDay).totalOps}</span></div>
              <div><span className={styles.dlbl}>PNL TOTAL</span><span className={styles.dval} style={{color:getDayData(selectedDay).totalPnl>=0?'#1D9E75':'#E24B4A'}}>{getDayData(selectedDay).totalPnl>=0?'+':''}${getDayData(selectedDay).totalPnl?.toFixed(2)}</span></div>
              <div><span className={styles.dlbl}>GANADAS</span><span className={styles.dval} style={{color:'#1D9E75'}}>{getDayData(selectedDay).wins}</span></div>
              <div><span className={styles.dlbl}>PERDIDAS</span><span className={styles.dval} style={{color:'#E24B4A'}}>{getDayData(selectedDay).losses}</span></div>
              <div><span className={styles.dlbl}>BREAK EVEN</span><span className={styles.dval} style={{color:'#F59E0B'}}>{getDayData(selectedDay).breakEvens}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
