import {test,expect} from '@playwright/test'

test('Handling Text box', async({page}) => {

    await page.goto('https://vinothqaacademy.com/demo-site/')

    // First name 
    const firstName =  page.getByRole('textbox',{name:'First Name'})

    // Assertions 
    await expect(firstName).toBeVisible()
    await expect(firstName).toBeEditable() // enabled

    await firstName.fill('Vinoth')

    // Assertion
    await expect(firstName).toHaveValue('Vinoth')
    await expect(firstName).toHaveValue(/^[A-Za-z]+$/)
 
    // clear 
    await firstName.clear()

    // Assertion
    await expect(firstName).toHaveValue('')

})
