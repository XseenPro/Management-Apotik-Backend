export default interface DrugType {
  name: string
  description?: string
  category: string
  purchasePrice: number
  margin: number
  quantity?: number
  unitName: string
  expiredDate: Date
  supplierName: string
  batchNo: string
  tax: number
}
