
import { GoogleGenAI } from "@google/genai";
import { PedestrianCrossing, CrossingState, AssetType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const aiService = {
  async generateStatisticalReport(crossings: PedestrianCrossing[], city: string): Promise<string> {
    try {
      // 1. Pre-processar dades per reduir tokens i millorar l'anàlisi
      const total = crossings.length;
      const critical = crossings.filter(c => c.state === CrossingState.POOR || c.state === CrossingState.DANGEROUS);
      
      const byState = crossings.reduce((acc, c) => {
        acc[c.state] = (acc[c.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byAsset = crossings.reduce((acc, c) => {
        acc[c.assetType] = (acc[c.assetType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const criticalStreets = critical.reduce((acc, c) => {
        const street = c.location.street || 'Desconegut';
        acc[street] = (acc[street] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCriticalStreets = Object.entries(criticalStreets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([street, count]) => `${street} (${count} incidències)`);

      // 2. Construir el prompt
      const prompt = `
        Actua com un tècnic expert en mobilitat urbana i manteniment de via pública.
        Analitza les següents dades estadístiques de l'inventari de ${city} i redacta un "Resum i Conclusions" per a un informe executiu oficial.
        
        DADES:
        - Total elements inspeccionats: ${total}
        - Desglossament per estat: ${JSON.stringify(byState)}
        - Desglossament per tipus d'actiu: ${JSON.stringify(byAsset)}
        - Total elements crítics (Deficient/Perillós): ${critical.length}
        - Carrers amb més urgència d'intervenció: ${topCriticalStreets.join(', ')}
        
        INSTRUCCIONS:
        - Escriu en Català formal i tècnic.
        - Sigues concís (màxim 150 paraules).
        - Estructura la resposta en 3 punts clau:
          1. Estat general de la xarxa (basat en el % de bo/excel·lent vs dolent).
          2. Identificació de zones/actius problemàtics.
          3. Recomanació d'actuació prioritària.
        - No posis títol, comença directament amb el text.
        - Fes servir negretes per destacar les dades clau o carrers.
        - No inventis dades que no estiguin aquí.
      `;

      // 3. Cridar a Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "No s'ha pogut generar l'anàlisi automàtic.";
    } catch (error) {
      console.error("Error generating AI report:", error);
      return "Error en la generació de l'informe assistit per IA. Si us plau, revisi la connexió o la clau API.";
    }
  }
};
