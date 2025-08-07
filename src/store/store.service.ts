import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface UpdateStoreData {
  storeName: string
  address: string
  phone: string
  logo?: Buffer
}

export const updateStore = async (data: UpdateStoreData) => {
  const { storeName, address, phone, logo } = data

  const updatedStore = await prisma.store.update({
    where: { id: 1 },
    data: {
      storeName,
      address,
      phone,
      ...(logo && { logo })
    }
  })

  return updatedStore
}

export const getStoreData = async () => {
  const store = await prisma.store.findFirst()
  return store
}
