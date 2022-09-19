import { Service } from "../src/Service";
jest.mock("fs")
const fs = require('fs')
fs.promises = {
    readFile: () => Promise.reject({ code: 'ENOENT'}),
    writeFile: () => Promise.resolve({}),
}


const updateService = () => Promise.resolve({text: 'updated'})
const service = new Service('test-service', { text: 'hejsan'}, updateService, 10)
var now = new Date()
service.now = () => now

test('write to service without updating timestamp', async () => {
    // Given
    now.setSeconds(now.getSeconds() + 10)
    await service.update()
    const result1 = await service.getDb().read()

    // When
    now.setSeconds(now.getSeconds() + 10)
    await service.write({ text: 'olle' }, false)

    // Then
    const result2 = await service.getDb().read()
    expect(result2.timestamp).toBe(result1.timestamp)
})
