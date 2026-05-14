# Keyboard Shortcuts Reference

## Form Builder Shortcuts

### Selection Mode
When you've entered field selection mode by clicking "Select Fields" button:

#### Create Group
- **Windows/Linux**: `Ctrl + G`
- **Mac**: `Cmd + G`
- **Requirements**: 
  - At least 2 fields must be selected
  - Selection mode must be active
- **Action**: Opens group creation dialog
- **Hint**: Visible in UI as tooltip on "Create Group" button

### Form Organization

#### Add New Section
- **Windows/Linux**: `Ctrl + Shift + S`
- **Mac**: `Cmd + Shift + S`
- **Requirements**: None (works from anywhere)
- **Action**: Opens section creation dialog
- **Hint**: Displayed in "Add Section" menu item

## Usage Examples

### Scenario 1: Group Contact Fields
1. Click "Select Fields" button to enter selection mode
2. Click on "First Name" field
3. Ctrl+Click (Cmd+Click on Mac) on "Last Name" and "Email" fields
4. Press `Ctrl+G` (or `Cmd+G` on Mac)
5. Enter "Contact Information" as group name
6. Confirm to create group

### Scenario 2: Add New Section with Keyboard
1. While working anywhere in the form
2. Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac)
3. Enter section name in the dialog
4. Confirm to create section

## Keyboard Shortcut Implementation

### Modifier Keys
- **Ctrl** (Windows/Linux): Controls key
- **Cmd** (Mac): Command key
- Both are handled automatically by the application

### Key Combinations
- Simple key + modifier: `Ctrl+G`
- Key with shift: `Ctrl+Shift+S`

### Event Handling
- Shortcuts prevent default browser behavior
- Don't interfere with text input in form fields
- Cleaned up properly to prevent memory leaks

## Best Practices

### When to Use Keyboard Shortcuts
- ✅ Experienced users who work with forms frequently
- ✅ When you have many fields to organize
- ✅ For faster workflow without reaching for mouse
- ✅ When repeating similar tasks

### When to Use UI Buttons
- ✅ First-time users discovering features
- ✅ When you need visual confirmation before action
- ✅ On touchscreen/mobile devices
- ✅ When working with one or two items

## Troubleshooting

### Shortcut Not Working?

**Check 1: Are you in the right mode?**
- For `Ctrl+G`: You must be in selection mode and have 2+ fields selected
- For `Ctrl+Shift+S`: Works anytime in the form builder

**Check 2: Is it a text input?**
- If you're typing in an input field, focus on clicking the button instead
- Shortcuts are global and work outside of text inputs

**Check 3: Browser/OS interference?**
- Some browsers or OS might intercept shortcuts
- Try the UI button as a workaround
- Most common: `Ctrl+S` is often reserved by browser

**Check 4: Platform?**
- Windows/Linux: Use `Ctrl`
- Mac: Use `Cmd` (not Ctrl)
- The app automatically handles both

## Visual Hints

### Create Group Tooltip
When hovering over the "Create Group" button:
```
┌─────────┐
│ Ctrl+G  │
└─────────┘
```

### Menu Items
In the dropdown menu, shortcuts are shown on the right:
```
┌─────────────────┬──────────┐
│ Add Section     │ Ctrl+⇧+S │
└─────────────────┴──────────┘
```

## Advanced Tips

### Power User Workflow
1. Enter selection mode once (click "Select Fields")
2. Multi-select fields using Ctrl+Click / Cmd+Click
3. Use `Ctrl+G` to group quickly
4. Use `Ctrl+Shift+S` when needed
5. Click "Cancel Selection" when done

### Muscle Memory
After using shortcuts a few times, they become muscle memory:
- `Ctrl+G` for grouping
- `Ctrl+Shift+S` for sections

This speeds up form building significantly!

## Limitations & Notes

- Shortcuts require JavaScript enabled
- Mobile/touchscreen devices won't trigger keyboard shortcuts
- Shortcuts don't work in dialog input fields (use buttons instead)
- Browser extensions might interfere with shortcuts
- Some keyboard layouts might have limitations (AZERTY, etc.)
