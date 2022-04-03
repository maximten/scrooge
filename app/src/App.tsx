import React, { useCallback, useEffect, useState } from 'react';
import { BarChart, Bar, Tooltip, Legend, ReferenceLine, CartesianGrid, XAxis, YAxis } from "recharts"

type Range = Record<number, number[]>

type SymbolDetailing = Record<string, Record<string, string>>

type DetailingResponse = {
  transactions: Record<string, SymbolDetailing>,
  total: Record<string, string>
}

const COLORS = ["f94144", "f8961e", "f9844a", "f9c74f", "90be6d", "43aa8b", "4d908e", "577590", "277da1", "f3722c"]

function App() {
  const [range, setRange] = useState<Range>({})
  const [detailing, setDetailing] = useState<any>()
  const [categories, setCategories] = useState<string[]>()
  const [total, setTotal] = useState<Record<string, string>>()
  const handleMonth = useCallback(async (e, year, month) => {
    e.preventDefault()
    const res = await fetch(`http://localhost:8080/month?year=${year}&month=${month}`)
    const data: DetailingResponse = await res.json()
    const categories: Record<string, string> = {}
    const days = Object.entries(data.transactions["sumUSD"]).reduce((carry, [day, dayCategories]) => {
      carry.push({
        ...dayCategories,
        day
      })
      Object.keys(dayCategories).forEach(c => {
        categories[c] = c
      })
      return carry
    }, [] as any)
    console.log()
    setDetailing(days)
    setCategories(Object.values(categories))
    setTotal(data.total)
  }, [])
  useEffect(() => {
    const fetchRange = async () => {
      const res = await fetch("http://localhost:8080/range")
      const data: {_id: {year: number, month: number}}[] = await res.json()
      const range: Range = {}
      data.forEach((month) => {
        if (!range[month._id.year]) {
          range[month._id.year] = []
        }
        range[month._id.year].push(month._id.month)
      })
      Object.values(range).forEach(monthsList => monthsList.sort((a, b) => a - b))
      setRange(range)
    }
    fetchRange()
  }, [])
  return (
    <div style={{display: "flex"}}>
      <ul>
        {
          Object.entries(range).map(([year, monthsList]) => (
            <li key={year}>
              <ul>
                { monthsList.map(month => (
                  <li key={month}>
                    <a href="#" onClick={(e) => handleMonth(e, year, month)}>{`${year}-${month}`}</a>
                  </li>
                )) }
              </ul>
            </li>
          ))
        }
      </ul>
      {
        detailing && categories && (
          <BarChart width={800} height={800} data={detailing}>
            {categories.map((category, index) => (
              <Bar dataKey={category} fill={`#${COLORS[index % COLORS.length]}`} stackId="stack" />
            )) }
            <Tooltip />
            <Legend />
            <ReferenceLine y={0} stroke="#000" />
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
          </BarChart>
        )
      }
      <div>
        {
          total && (
            <>
              <h2>TOTAL</h2>
              {total["sumUSD"]} $
            </>            
          )
        }
      </div>
    </div>
  );
}

export default App;
