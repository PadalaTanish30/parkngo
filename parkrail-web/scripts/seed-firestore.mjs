import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const projectId = 'parkngo-f218c'
const operatorId = '77rBmRDzilXGdBqryH9kcpRjHSu1'
const configCandidates = [
  path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
  path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'configstore', 'firebase-tools.json'),
]
const configPath = configCandidates.find((candidate) => fs.existsSync(candidate)) ?? configCandidates[0]

if (!fs.existsSync(configPath)) {
  throw new Error(`Firebase CLI credentials were not found at ${configPath}. Run firebase login first.`)
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const accessToken = config.tokens?.access_token
if (!accessToken) throw new Error('Firebase CLI access token was not found. Run firebase login again.')

const values = [
  {
    id: 'secunderabad-central',
    name: 'Secunderabad Central Parking',
    station: 'Secunderabad Junction',
    stationType: 'railway',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Railway Station Road, Secunderabad',
    distance: '0.2 km',
    walk: '3 min walk',
    fullDayPrice: 180,
    overnightPrice: 240,
    available: 42,
    total: 120,
    rating: 4.8,
    accent: 'terracotta',
    features: ['CCTV monitored', 'Covered parking', 'Station shuttle'],
    coordinates: [17.4334, 78.5013],
  },
  {
    id: 'nampally-transit',
    name: 'Nampally Transit Parking',
    station: 'Hyderabad Deccan',
    stationType: 'railway',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Nampally Station Road, Hyderabad',
    distance: '0.3 km',
    walk: '4 min walk',
    fullDayPrice: 150,
    overnightPrice: 210,
    available: 28,
    total: 90,
    rating: 4.7,
    accent: 'indigo',
    features: ['Open-air', 'Well lit', 'Accessible spaces'],
    coordinates: [17.393, 78.473],
  },
  {
    id: 'kacheguda-park',
    name: 'Kacheguda Travel Park',
    station: 'Kacheguda',
    stationType: 'railway',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Kacheguda Station Road, Hyderabad',
    distance: '0.3 km',
    walk: '5 min walk',
    fullDayPrice: 140,
    overnightPrice: 190,
    available: 31,
    total: 100,
    rating: 4.6,
    accent: 'olive',
    features: ['CCTV monitored', 'Motorbike bays', '24/7 access'],
    coordinates: [17.3784, 78.4983],
  },
  {
    id: 'ameerpet-metro',
    name: 'Ameerpet Metro Park',
    station: 'Ameerpet',
    stationType: 'metro',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Ameerpet Metro, Hyderabad',
    distance: '0.2 km',
    walk: '3 min walk',
    fullDayPrice: 100,
    overnightPrice: 150,
    available: 19,
    total: 70,
    rating: 4.7,
    accent: 'terracotta',
    features: ['CCTV monitored', 'Motorbike bays', 'Well lit'],
    coordinates: [17.4375, 78.4483],
  },
  {
    id: 'secunderabad-east-metro',
    name: 'East Metro Park',
    station: 'Secunderabad East',
    stationType: 'metro',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'East Metro Station, Secunderabad',
    distance: '0.2 km',
    walk: '3 min walk',
    fullDayPrice: 90,
    overnightPrice: 140,
    available: 24,
    total: 80,
    rating: 4.5,
    accent: 'blue',
    features: ['Open-air', 'Motorbike bays', 'UPI accepted'],
    coordinates: [17.4399, 78.5024],
  },
  {
    id: 'raidurg-metro',
    name: 'Raidurg Tech District Parking',
    station: 'Raidurg',
    stationType: 'metro',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Raidurg Metro, Hyderabad',
    distance: '0.4 km',
    walk: '6 min walk',
    fullDayPrice: 120,
    overnightPrice: 180,
    available: 36,
    total: 150,
    rating: 4.8,
    accent: 'olive',
    features: ['CCTV monitored', 'Covered parking', 'EV charging'],
    coordinates: [17.4435, 78.386],
  },
]

const stringValue = (value) => ({ stringValue: value })
const integerValue = (value) => ({ integerValue: String(value) })
const doubleValue = (value) => ({ doubleValue: value })
const arrayValue = (values) => ({ arrayValue: { values } })

const toFields = (lot) => ({
  ...(() => {
    const totalTwoWheeler = Math.ceil(lot.total * 0.6)
    const availableTwoWheeler = Math.min(Math.ceil(lot.available * 0.6), totalTwoWheeler)
    return {
      availableTwoWheeler: integerValue(availableTwoWheeler),
      totalTwoWheeler: integerValue(totalTwoWheeler),
      availableFourWheeler: integerValue(lot.available - availableTwoWheeler),
      totalFourWheeler: integerValue(lot.total - totalTwoWheeler),
    }
  })(),
  name: stringValue(lot.name),
  station: stringValue(lot.station),
  stationType: stringValue(lot.stationType),
  city: stringValue(lot.city),
  state: stringValue(lot.state),
  area: stringValue(lot.area),
  distance: stringValue(lot.distance),
  walk: stringValue(lot.walk),
  fullDayPrice: integerValue(lot.fullDayPrice),
  overnightPrice: integerValue(lot.overnightPrice),
  available: integerValue(lot.available),
  total: integerValue(lot.total),
  rating: doubleValue(lot.rating),
  accent: stringValue(lot.accent),
  features: arrayValue(lot.features.map(stringValue)),
   coordinates: arrayValue(lot.coordinates.map(doubleValue)),
   status: stringValue('Live'),
   operatorId: stringValue(operatorId),
})

for (const lot of values) {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/parkingLots/${lot.id}`
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(lot) }),
  })
  if (!response.ok) throw new Error(`${lot.name}: ${response.status} ${await response.text()}`)
  console.log(`Seeded ${lot.name}`)
}
