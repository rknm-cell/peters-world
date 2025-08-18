# Terraforming System Testing Guide

This document explains how to test the terraforming tools to ensure they work correctly.

## 🧪 **Test Coverage**

The terraforming system includes comprehensive tests covering:

### **1. Store Tests** (`src/lib/store.test.ts`)
- ✅ Terrain state initialization
- ✅ Terraform mode management
- ✅ Brush size and strength controls
- ✅ Terrain vertex management
- ✅ State persistence and updates

### **2. TerrainSystem Tests** (`src/components/editor/TerrainSystem.test.tsx`)
- ✅ Component rendering
- ✅ Terrain vertex initialization
- ✅ Height and water deformation
- ✅ Material creation
- ✅ Water overlay rendering
- ✅ Geometry updates

### **3. TerraformController Tests** (`src/components/editor/TerraformController.test.tsx`)
- ✅ Event handling setup
- ✅ Terraforming logic for all modes
- ✅ Brush calculations
- ✅ Vertex updates
- ✅ Event prevention

### **4. TerraformToolbar Tests** (`src/components/ui/TerraformToolbar.test.tsx`)
- ✅ UI rendering
- ✅ Tool selection and activation
- ✅ Brush controls
- ✅ Reset functionality
- ✅ Active state indicators

### **5. Integration Tests** (`src/components/editor/__tests__/TerraformingIntegration.test.tsx`)
- ✅ Complete terraforming workflows
- ✅ Tool switching
- ✅ Brush control integration
- ✅ UI state consistency
- ✅ Error handling
- ✅ Performance testing

## 🚀 **Running Tests**

### **Run All Tests**
```bash
bun test
```

### **Run Terraforming Tests Only**
```bash
bun test:terraforming
```

### **Run Tests in Watch Mode**
```bash
bun test:watch
```

### **Run Tests with Coverage**
```bash
bun test:coverage
```

## 🔧 **Test Setup**

The testing environment is configured with:

- **Bun Test Runner** - Fast, native test runner
- **React Testing Library** - Component testing utilities
- **Mocked Dependencies** - Three.js, React Three Fiber, and DOM APIs
- **Test Environment** - Proper DOM mocking for browser APIs

## 📋 **What Tests Verify**

### **Core Functionality**
- [x] All terraforming tools activate correctly
- [x] Brush size and strength controls work
- [x] Terrain deformation applies properly
- [x] Water features render correctly
- [x] Globe rotation disables during terraforming

### **User Experience**
- [x] Tool selection provides visual feedback
- [x] Brush controls appear/disappear appropriately
- [x] Instructions show when tools are active
- [x] Reset functionality works with confirmation
- [x] Active state indicators display correctly

### **Technical Robustness**
- [x] Event handling prevents conflicts
- [x] State management maintains consistency
- [x] Error handling works gracefully
- [x] Performance remains stable
- [x] Memory usage is optimized

## 🐛 **Debugging Tests**

### **Common Issues**
1. **Mock Dependencies** - Ensure Three.js and React Three Fiber are properly mocked
2. **DOM Environment** - Check that test-setup.ts is loading correctly
3. **Async Operations** - Use proper async/await patterns for state updates

### **Test Isolation**
Each test runs in isolation with:
- Fresh store state
- Clean mock functions
- Reset DOM environment
- No shared state between tests

## 📊 **Test Results**

When you run the tests, you should see output like:

```
✓ World Store - Terrain Management
  ✓ Terrain State Initialization
  ✓ Terraform Mode Management
  ✓ Brush Controls
  ✓ Terraforming State
  ✓ Terrain Vertices Management
  ✓ Terrain Reset
  ✓ Store Integration

✓ TerrainSystem
  ✓ Component Rendering
  ✓ Terrain Vertex Initialization
  ✓ Terrain Deformation
  ✓ Material Creation
  ✓ Water Overlay Rendering
  ✓ Geometry Updates

✓ TerraformController
  ✓ Component Rendering
  ✓ Event Handling Setup
  ✓ Terraforming Logic
  ✓ Brush Calculations
  ✓ Vertex Updates
  ✓ Event Prevention

✓ TerraformToolbar
  ✓ Component Rendering
  ✓ Tool Selection
  ✓ Active Tool Styling
  ✓ Brush Controls
  ✓ Reset Functionality
  ✓ Active State Indicators
  ✓ Instructions
  ✓ Tool Tips

✓ Terraforming Integration Tests
  ✓ Complete Terraforming Workflow
  ✓ Brush Control Integration
  ✓ Reset Integration
  ✓ UI State Consistency
  ✓ Error Handling
  ✓ Performance

Test Results: 45 tests passed, 0 tests failed
```

## 🎯 **Adding New Tests**

When adding new terraforming features:

1. **Update existing tests** to cover new functionality
2. **Add integration tests** for new workflows
3. **Test edge cases** and error conditions
4. **Verify performance** with new features
5. **Update this guide** with new test coverage

## 🔍 **Test Quality Standards**

- **Coverage**: Aim for >90% test coverage
- **Isolation**: Tests should not depend on each other
- **Readability**: Clear test descriptions and assertions
- **Maintainability**: Easy to update when features change
- **Performance**: Tests should run quickly (<5 seconds total)

## 📝 **Test Naming Convention**

- **Describe blocks**: Use feature/component names
- **Test cases**: Use "should [expected behavior]" format
- **Grouping**: Group related tests logically
- **Edge cases**: Include "should handle [edge case]" tests

This comprehensive testing ensures your terraforming tools work reliably and provide a great user experience!
