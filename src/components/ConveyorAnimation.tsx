import { useMemo } from 'react'
import './ConveyorAnimation.css'

const ITEM_COUNT = 8
const FRAUD_PROBABILITY = 0.35
const LOOP_SECONDS = 18

type ConveyorItem = {
  id: string
  fraud: boolean
}

function buildConveyorItems(): ConveyorItem[] {
  return Array.from({ length: ITEM_COUNT }, (_, index) => ({
    id: `item-${index}`,
    fraud: Math.random() < FRAUD_PROBABILITY,
  }))
}

function ConveyorAnimation() {
  const loopItems = useMemo(() => {
    const items = buildConveyorItems()
    return [...items, ...items]
  }, [])

  return (
    <section className="conveyor" aria-hidden="true">
      <p className="conveyor__label">Transactions scanned for fraud in real time</p>

      <div className="conveyor__viewport">
        <div className="conveyor__scan-zone" />

        <img
          className="conveyor__scanner"
          src="/images/magnifying_glass.png"
          alt=""
        />

        <div className="conveyor__belt">
          <div
            className="conveyor__track"
            style={{ ['--loop-seconds' as string]: `${LOOP_SECONDS}s` }}
          >
            {loopItems.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className={`conveyor__item${
                  item.fraud ? ' conveyor__item--fraud' : ''
                }`}
                style={
                  {
                    '--item-index': index % ITEM_COUNT,
                    '--item-stagger': `${-LOOP_SECONDS / ITEM_COUNT}s`,
                    '--loop-seconds': `${LOOP_SECONDS}s`,
                  } as React.CSSProperties
                }
              >
                <img
                  className="conveyor__item-image conveyor__item-image--normal"
                  src="/images/transaction_page.png"
                  alt=""
                />
                <img
                  className="conveyor__item-image conveyor__item-image--fraud"
                  src="/images/transaction_page_fraudrep.png"
                  alt=""
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ConveyorAnimation
