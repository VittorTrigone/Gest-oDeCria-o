/* ==========================================================================
   Creative Sector Manager Hub - Product Pricing & Profit Calculator Module
   ========================================================================== */

class PricingCalculatorModule {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.calculate();
    }

    bindEvents() {
        const inputs = [
            'calc-cost',
            'calc-extra-cost',
            'calc-shipping',
            'calc-tax-percent',
            'calc-commission-percent',
            'calc-desired-margin'
        ];

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.calculate());
            }
        });
    }

    calculate() {
        const cost = parseFloat(document.getElementById('calc-cost')?.value) || 0;
        const extraCost = parseFloat(document.getElementById('calc-extra-cost')?.value) || 0;
        const shipping = parseFloat(document.getElementById('calc-shipping')?.value) || 0;
        const taxPercent = (parseFloat(document.getElementById('calc-tax-percent')?.value) || 0) / 100;
        const commissionPercent = (parseFloat(document.getElementById('calc-commission-percent')?.value) || 0) / 100;
        const desiredMarginPercent = (parseFloat(document.getElementById('calc-desired-margin')?.value) || 0) / 100;

        const totalDirectCost = cost + extraCost + shipping;

        // Formula: Selling Price = Direct Costs / (1 - (Tax % + Commission % + Desired Margin %))
        const totalDeductionsPercent = taxPercent + commissionPercent + desiredMarginPercent;
        
        let suggestedPrice = 0;
        let netProfit = 0;
        let taxValue = 0;
        let commissionValue = 0;
        let markup = 0;

        if (totalDeductionsPercent < 1 && totalDirectCost > 0) {
            suggestedPrice = totalDirectCost / (1 - totalDeductionsPercent);
            taxValue = suggestedPrice * taxPercent;
            commissionValue = suggestedPrice * commissionPercent;
            netProfit = suggestedPrice * desiredMarginPercent;
            markup = cost > 0 ? (suggestedPrice / cost).toFixed(2) : 0;
        }

        // Update DOM elements
        this.updateText('res-suggested-price', `R$ ${suggestedPrice.toFixed(2)}`);
        this.updateText('res-net-profit', `R$ ${netProfit.toFixed(2)}`);
        this.updateText('res-direct-cost', `R$ ${totalDirectCost.toFixed(2)}`);
        this.updateText('res-tax-val', `R$ ${taxValue.toFixed(2)}`);
        this.updateText('res-commission-val', `R$ ${commissionValue.toFixed(2)}`);
        this.updateText('res-markup', `${markup}x`);
    }

    updateText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.pricingCalculatorModule = new PricingCalculatorModule();
});
