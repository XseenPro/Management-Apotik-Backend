import 'dotenv/config'
import crypto from 'crypto'

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})

const CONFIG = {
  jwt_public: publicKey,
  jwt_private: privateKey
}
export default CONFIG
