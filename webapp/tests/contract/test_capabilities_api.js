/**
 * @fileoverview Contract test for capabilities endpoint
 * @description Tests the capabilities API endpoint contract
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { capabilities } from '../../src/lib/config/capabilities.js';

describe('Capabilities API Contract', () => {
  describe('GET /projects/genproj/api/capabilities', () => {
    it('should return list of capabilities', async () => {
      // This test will fail until the endpoint is implemented
      const response = await fetch('/projects/genproj/api/capabilities');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('capabilities');
      expect(Array.isArray(data.capabilities)).toBe(true);
      expect(data.capabilities.length).toBeGreaterThan(0);
    });

    it('should return capabilities with required fields', async () => {
      const response = await fetch('/projects/genproj/api/capabilities');
      const data = await response.json();
      
      for (const capability of data.capabilities) {
        expect(capability).toHaveProperty('id');
        expect(capability).toHaveProperty('name');
        expect(capability).toHaveProperty('description');
        expect(capability).toHaveProperty('category');
        expect(capability).toHaveProperty('dependencies');
        expect(capability).toHaveProperty('conflicts');
        expect(capability).toHaveProperty('requiresAuth');
        expect(capability).toHaveProperty('configurationSchema');
        expect(capability).toHaveProperty('templates');
        
        expect(typeof capability.id).toBe('string');
        expect(typeof capability.name).toBe('string');
        expect(typeof capability.description).toBe('string');
        expect(typeof capability.category).toBe('string');
        expect(Array.isArray(capability.dependencies)).toBe(true);
        expect(Array.isArray(capability.conflicts)).toBe(true);
        expect(Array.isArray(capability.requiresAuth)).toBe(true);
        expect(typeof capability.configurationSchema).toBe('object');
        expect(Array.isArray(capability.templates)).toBe(true);
      }
    });

    it('should return capabilities matching local configuration', async () => {
      const response = await fetch('/projects/genproj/api/capabilities');
      const data = await response.json();
      
      expect(data.capabilities.length).toBe(capabilities.length);
      
      // Check that all local capabilities are returned
      for (const localCapability of capabilities) {
        const apiCapability = data.capabilities.find(c => c.id === localCapability.id);
        expect(apiCapability).toBeDefined();
        expect(apiCapability.name).toBe(localCapability.name);
        expect(apiCapability.description).toBe(localCapability.description);
        expect(apiCapability.category).toBe(localCapability.category);
      }
    });

    it('should work without authentication', async () => {
      // Test that capabilities can be fetched without authentication
      const response = await fetch('/projects/genproj/api/capabilities');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.capabilities).toBeDefined();
    });

    it('should return consistent capability IDs', async () => {
      const response1 = await fetch('/projects/genproj/api/capabilities');
      const response2 = await fetch('/projects/genproj/api/capabilities');
      
      const data1 = await response1.json();
      const data2 = await response2.json();
      
      expect(data1.capabilities.length).toBe(data2.capabilities.length);
      
      const ids1 = data1.capabilities.map(c => c.id).sort();
      const ids2 = data2.capabilities.map(c => c.id).sort();
      
      expect(ids1).toEqual(ids2);
    });

    it('should handle errors gracefully', async () => {
      // Test error handling (this will fail until proper error handling is implemented)
      const response = await fetch('/projects/genproj/api/capabilities/invalid');
      expect(response.status).toBe(404);
    });
  });

  describe('Capability Categories', () => {
    it('should return capabilities grouped by category', async () => {
      const response = await fetch('/projects/genproj/api/capabilities');
      const data = await response.json();
      
      const categories = new Set(data.capabilities.map(c => c.category));
      const expectedCategories = ['devcontainer', 'ci-cd', 'code-quality', 'secrets', 'deployment', 'monitoring'];
      
      for (const category of expectedCategories) {
        expect(categories.has(category)).toBe(true);
      }
    });

    it('should have valid category values', async () => {
      const response = await fetch('/projects/genproj/api/capabilities');
      const data = await response.json();
      
      const validCategories = ['devcontainer', 'ci-cd', 'code-quality', 'secrets', 'deployment', 'monitoring'];
      
      for (const capability of data.capabilities) {
        expect(validCategories).toContain(capability.category);
      }
    });
  });

  describe('Capability Dependencies', () => {
    it('should have valid dependency references', async () => {
      const response = await fetch('/projects/genproj/api/capabilities');
      const data = await response.json();
      
      const capabilityIds = data.capabilities.map(c => c.id);
      
      for (const capability of data.capabilities) {
        for (const dependency of capability.dependencies) {
          expect(capabilityIds).toContain(dependency);
        }
      }
    });

    it('should have valid conflict references', async () => {
      const response = await fetch('/projects/genproj/api/capabilities');
      const data = await response.json();
      
      const capabilityIds = data.capabilities.map(c => c.id);
      
      for (const capability of data.capabilities) {
        for (const conflict of capability.conflicts) {
          expect(capabilityIds).toContain(conflict);
        }
      }
    });
  });

  describe('Authentication Requirements', () => {
    it('should have valid authentication service references', async () => {
      const response = await fetch('/projects/genproj/api/capabilities');
      const data = await response.json();
      
      const validAuthServices = ['github', 'circleci', 'doppler', 'sonarcloud'];
      
      for (const capability of data.capabilities) {
        for (const authService of capability.requiresAuth) {
          expect(validAuthServices).toContain(authService);
        }
      }
    });
  });

  describe('Configuration Schema', () => {
    it('should have valid configuration schemas', async () => {
      const response = await fetch('/projects/genproj/api/capabilities');
      const data = await response.json();
      
      for (const capability of data.capabilities) {
        const schema = capability.configurationSchema;
        expect(schema).toHaveProperty('type');
        expect(schema.type).toBe('object');
        
        if (schema.properties) {
          expect(typeof schema.properties).toBe('object');
        }
      }
    });
  });

  describe('Templates', () => {
    it('should have valid template references', async () => {
      const response = await fetch('/projects/genproj/api/capabilities');
      const data = await response.json();
      
      for (const capability of data.capabilities) {
        for (const template of capability.templates) {
          expect(template).toHaveProperty('id');
          expect(template).toHaveProperty('filePath');
          expect(template).toHaveProperty('templateId');
          
          expect(typeof template.id).toBe('string');
          expect(typeof template.filePath).toBe('string');
          expect(typeof template.templateId).toBe('string');
        }
      }
    });
  });
});
