/**
 * Form testing helper functions
 */

import { Page, expect } from '@playwright/test'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'

/**
 * Helper to fill out forms in E2E tests
 */
export class FormHelper {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Fill a form field by label text
   */
  async fillByLabel(labelText: string, value: string) {
    const field = this.page.getByRole('textbox', { name: new RegExp(labelText, 'i') })
    await field.fill(value)
  }

  /**
   * Fill a form field by placeholder
   */
  async fillByPlaceholder(placeholder: string, value: string) {
    const field = this.page.getByPlaceholder(new RegExp(placeholder, 'i'))
    await field.fill(value)
  }

  /**
   * Fill a form field by data-testid
   */
  async fillByTestId(testId: string, value: string) {
    const field = this.page.getByTestId(testId)
    await field.fill(value)
  }

  /**
   * Select a dropdown option by label
   */
  async selectByLabel(labelText: string, optionText: string) {
    const select = this.page.getByRole('combobox', { name: new RegExp(labelText, 'i') })
    await select.selectOption({ label: optionText })
  }

  /**
   * Check a checkbox by label
   */
  async checkByLabel(labelText: string) {
    const checkbox = this.page.getByRole('checkbox', { name: new RegExp(labelText, 'i') })
    await checkbox.check()
  }

  /**
   * Uncheck a checkbox by label
   */
  async uncheckByLabel(labelText: string) {
    const checkbox = this.page.getByRole('checkbox', { name: new RegExp(labelText, 'i') })
    await checkbox.uncheck()
  }

  /**
   * Select a radio button by label
   */
  async selectRadioByLabel(labelText: string) {
    const radio = this.page.getByRole('radio', { name: new RegExp(labelText, 'i') })
    await radio.check()
  }

  /**
   * Submit a form by button text
   */
  async submitByButtonText(buttonText: string) {
    const button = this.page.getByRole('button', { name: new RegExp(buttonText, 'i') })
    await button.click()
  }

  /**
   * Clear a form field
   */
  async clearField(selector: string) {
    await this.page.fill(selector, '')
  }

  /**
   * Fill an entire form with data
   */
  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      try {
        await this.fillByLabel(field, value)
      } catch {
        try {
          await this.fillByPlaceholder(field, value)
        } catch {
          await this.fillByTestId(field, value)
        }
      }
    }
  }

  /**
   * Validate form field has specific value
   */
  async expectFieldValue(labelText: string, expectedValue: string) {
    const field = this.page.getByRole('textbox', { name: new RegExp(labelText, 'i') })
    await expect(field).toHaveValue(expectedValue)
  }

  /**
   * Validate form field is required
   */
  async expectFieldRequired(labelText: string) {
    const field = this.page.getByRole('textbox', { name: new RegExp(labelText, 'i') })
    await expect(field).toHaveAttribute('required')
  }

  /**
   * Validate form field has error
   */
  async expectFieldError(labelText: string, errorMessage?: string) {
    const field = this.page.getByRole('textbox', { name: new RegExp(labelText, 'i') })
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    
    if (errorMessage) {
      await expect(this.page.getByText(new RegExp(errorMessage, 'i'))).toBeVisible()
    }
  }

  /**
   * Validate form is disabled during submission
   */
  async expectFormDisabled() {
    const submitButton = this.page.getByRole('button', { name: /submit|save|create|update/i })
    await expect(submitButton).toBeDisabled()
  }

  /**
   * Validate form shows loading state
   */
  async expectFormLoading() {
    await expect(this.page.getByText(/loading|submitting|saving/i)).toBeVisible()
  }
}

/**
 * Helper for component testing form interactions
 */
export class ComponentFormHelper {
  private user = userEvent.setup()

  /**
   * Fill a form field by label
   */
  async fillByLabel(labelText: string, value: string) {
    const field = screen.getByRole('textbox', { name: new RegExp(labelText, 'i') })
    await this.user.clear(field)
    await this.user.type(field, value)
  }

  /**
   * Fill a form field by placeholder
   */
  async fillByPlaceholder(placeholder: string, value: string) {
    const field = screen.getByPlaceholderText(new RegExp(placeholder, 'i'))
    await this.user.clear(field)
    await this.user.type(field, value)
  }

  /**
   * Select dropdown option
   */
  async selectOption(labelText: string, optionText: string) {
    const select = screen.getByRole('combobox', { name: new RegExp(labelText, 'i') })
    await this.user.selectOptions(select, optionText)
  }

  /**
   * Check checkbox
   */
  async checkCheckbox(labelText: string) {
    const checkbox = screen.getByRole('checkbox', { name: new RegExp(labelText, 'i') })
    await this.user.click(checkbox)
  }

  /**
   * Click radio button
   */
  async clickRadio(labelText: string) {
    const radio = screen.getByRole('radio', { name: new RegExp(labelText, 'i') })
    await this.user.click(radio)
  }

  /**
   * Submit form
   */
  async submitForm(buttonText = /submit|save|create|update/i) {
    const button = screen.getByRole('button', { name: buttonText })
    await this.user.click(button)
  }

  /**
   * Fill entire form with data
   */
  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      try {
        await this.fillByLabel(field, value)
      } catch {
        await this.fillByPlaceholder(field, value)
      }
    }
  }

  /**
   * Simulate form validation by triggering blur events
   */
  async triggerValidation(labelText: string) {
    const field = screen.getByRole('textbox', { name: new RegExp(labelText, 'i') })
    await this.user.click(field)
    await this.user.tab() // Move focus away to trigger validation
  }
}

/**
 * Common form data for testing
 */
export const FormTestData = {
  // User registration form
  userRegistration: {
    'first name': 'John',
    'last name': 'Doe',
    'email': 'john.doe@example.com',
    'password': 'password123',
    'confirm password': 'password123',
  },

  // User login form
  userLogin: {
    'email': 'user@example.com',
    'password': 'password123',
  },

  // Organization form
  organization: {
    'name': 'Test Football League',
    'description': 'A professional football league for testing',
    'country': 'United States',
    'timezone': 'America/New_York',
    'website': 'https://testleague.com',
  },

  // Team form
  team: {
    'name': 'Test Team',
    'short name': 'TEST',
    'venue': 'Test Stadium',
    'primary color': '#1E40AF',
    'secondary color': '#FFFFFF',
  },

  // Player form
  player: {
    'first name': 'Player',
    'last name': 'Test',
    'jersey number': '10',
    'position': 'midfielder',
    'birth date': '1995-01-01',
    'nationality': 'Test Country',
    'height': '175',
    'weight': '70',
  },

  // Tournament form
  tournament: {
    'name': 'Test Tournament',
    'description': 'A test tournament',
    'sport': 'football',
    'format': 'league',
    'start date': '2024-06-01',
    'end date': '2024-08-31',
    'max teams': '16',
  },

  // Match form
  match: {
    'scheduled date': '2024-06-15',
    'scheduled time': '15:00',
    'venue': 'Test Stadium',
  },
}

/**
 * Common form validation patterns
 */
export const FormValidation = {
  // Required field messages
  required: /required|this field is required|field is mandatory/i,
  
  // Email validation
  invalidEmail: /invalid email|enter a valid email|email format is incorrect/i,
  
  // Password validation
  passwordTooShort: /password must be at least \d+ characters/i,
  passwordsDoNotMatch: /passwords do not match|passwords must match/i,
  
  // Number validation
  invalidNumber: /must be a number|invalid number/i,
  numberTooLow: /must be greater than|minimum value is/i,
  numberTooHigh: /must be less than|maximum value is/i,
  
  // Date validation
  invalidDate: /invalid date|enter a valid date/i,
  pastDate: /date cannot be in the past/i,
  futureDate: /date cannot be in the future/i,
  
  // String validation
  tooShort: /must be at least \d+ characters/i,
  tooLong: /must be no more than \d+ characters/i,
  
  // Custom validation
  duplicateValue: /already exists|duplicate value/i,
  invalidFormat: /invalid format|format is incorrect/i,
}

/**
 * Helper to test form accessibility
 */
export async function testFormAccessibility(page: Page) {
  // Check that all form fields have labels
  const inputs = await page.locator('input, select, textarea').all()
  
  for (const input of inputs) {
    const inputId = await input.getAttribute('id')
    const ariaLabel = await input.getAttribute('aria-label')
    const ariaLabelledBy = await input.getAttribute('aria-labelledby')
    
    if (inputId) {
      const hasLabel = await page.locator(`label[for="${inputId}"]`).count() > 0
      expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy()
    } else {
      expect(ariaLabel || ariaLabelledBy).toBeTruthy()
    }
  }

  // Check that error messages are associated with fields
  const errorMessages = await page.locator('[role="alert"], .error-message, [aria-live="polite"]').all()
  
  for (const error of errorMessages) {
    const isVisible = await error.isVisible()
    if (isVisible) {
      const errorId = await error.getAttribute('id')
      if (errorId) {
        const associatedField = await page.locator(`[aria-describedby*="${errorId}"]`).count()
        expect(associatedField).toBeGreaterThan(0)
      }
    }
  }

  // Check form has proper heading structure
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
  expect(headings.length).toBeGreaterThan(0)
}
