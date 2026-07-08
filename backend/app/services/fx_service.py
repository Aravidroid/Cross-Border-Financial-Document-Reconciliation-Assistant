import logging
from datetime import datetime, date, timezone
from typing import Any, Dict, Optional, Tuple
import httpx

from app.config import settings
from app.models import Invoice

logger = logging.getLogger(__name__)


class FXService:
    """
    FX Intelligence Service for cross-border financial operations.
    Provides deterministic calculations, exchange rate fetching (Frankfurter API),
    amount conversion, variance, gain/loss analysis, risk scoring, and recommendations.
    """

    def __init__(self):
        self.base_url = settings.FX_API_URL or "https://api.frankfurter.app"

    def get_exchange_rate(
        self,
        from_currency: str,
        to_currency: str,
        date_val: Optional[Any] = None
    ) -> Tuple[float, datetime]:
        """
        Fetch exchange rate between two currencies, optionally on a historical date.
        
        Args:
            from_currency: Source currency code (e.g. 'EUR')
            to_currency: Target currency code (e.g. 'INR')
            date_val: Optional date or datetime object for historical rate.
            
        Returns:
            Tuple[float, datetime]: (exchange_rate, rate_timestamp)
        """
        symbol_map = {
            "$": "USD",
            "€": "EUR",
            "£": "GBP",
            "¥": "JPY",
            "₹": "INR"
        }
        from_curr = from_currency.upper().strip()
        from_curr = symbol_map.get(from_curr, from_curr)
        
        to_curr = to_currency.upper().strip()
        to_curr = symbol_map.get(to_curr, to_curr)

        # Same currency short-circuit
        if from_curr == to_curr:
            return 1.0, datetime.now(timezone.utc).replace(tzinfo=None)

        endpoint = "latest"
        if date_val is not None:
            if isinstance(date_val, (datetime, date)):
                endpoint = date_val.strftime("%Y-%m-%d")
            else:
                endpoint = str(date_val)

        url = f"{self.base_url}/{endpoint}"
        params = {"from": from_curr, "to": to_curr}

        try:
            logger.info(f"Fetching FX rate from {from_curr} to {to_curr} for {endpoint}")
            # Use httpx with a 5-second timeout and follow redirects
            with httpx.Client(timeout=5.0, follow_redirects=True) as client:
                response = client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                # Validate response structure
                if "rates" not in data or to_curr not in data["rates"]:
                    raise ValueError(f"Target currency '{to_curr}' not found in Frankfurter API response.")

                rate = float(data["rates"][to_curr])
                if rate <= 0:
                    raise ValueError(f"Invalid rate retrieved from Frankfurter API: {rate}")

                # Extract date from API response to populate rate_timestamp
                rate_date_str = data.get("date")
                if rate_date_str:
                    try:
                        # Frankfurter returns YYYY-MM-DD
                        rate_timestamp = datetime.strptime(rate_date_str, "%Y-%m-%d")
                    except Exception:
                        rate_timestamp = datetime.now(timezone.utc).replace(tzinfo=None)
                else:
                    rate_timestamp = datetime.now(timezone.utc).replace(tzinfo=None)

                return rate, rate_timestamp

        except httpx.TimeoutException as te:
            logger.error(f"Frankfurter API request timed out: {str(te)}")
            raise TimeoutError(f"Frankfurter API request timed out: {str(te)}")
        except httpx.HTTPStatusError as hse:
            logger.error(f"Frankfurter API HTTP status error: {response.status_code} - {response.text}")
            raise RuntimeError(f"Frankfurter API returned HTTP status {response.status_code}: {response.text}")
        except httpx.RequestError as re:
            logger.error(f"Frankfurter API connection error: {str(re)}")
            raise ConnectionError(f"Failed to connect to Frankfurter API: {str(re)}")
        except Exception as e:
            logger.error(f"Unexpected error fetching exchange rate: {str(e)}")
            raise e

    def convert_amount(
        self,
        amount: float,
        from_currency: str,
        to_currency: str,
        date_val: Optional[Any] = None
    ) -> float:
        """
        Converts an amount from one currency to another using latest or historical exchange rate.
        """
        rate, _ = self.get_exchange_rate(from_currency, to_currency, date_val=date_val)
        return float(amount) * rate

    def calculate_fx_variance(self, invoice_rate: float, current_rate: float) -> float:
        """
        Calculate the percentage variance between the historical rate and the current rate.
        
        Formula: ((current_rate - invoice_rate) / invoice_rate) * 100
        """
        if invoice_rate <= 0:
            raise ValueError("Invoice rate must be greater than zero.")
        variance = ((current_rate - invoice_rate) / invoice_rate) * 100
        return round(variance, 4)

    def calculate_gain_loss(
        self,
        original_amount: float,
        invoice_rate: float,
        current_rate: float
    ) -> float:
        """
        Calculate financial Gain/Loss in the base currency (from Accounts Payable perspective).
        Positive = Gain (favorable, costs less base currency to settle)
        Negative = Loss (unfavorable, costs more base currency to settle)
        
        Formula: original_amount * (invoice_rate - current_rate)
        """
        gain_loss = float(original_amount) * (invoice_rate - current_rate)
        return round(gain_loss, 2)

    def calculate_fx_risk(self, variance: float) -> str:
        """
        Evaluate FX risk based on absolute percentage variance.
        
        Risk Boundaries:
        - < 2%       -> LOW
        - 2% - 5%    -> MEDIUM
        - 5% - 10%   -> HIGH
        - > 10%      -> CRITICAL
        """
        abs_var = abs(variance)
        if abs_var < 2.0:
            return "LOW"
        elif abs_var < 5.0:
            return "MEDIUM"
        elif abs_var < 10.0:
            return "HIGH"
        else:
            return "CRITICAL"

    def generate_payment_recommendation(self, risk_level: str) -> str:
        """
        Generate deterministic payment recommendation based on risk level.
        """
        lvl = risk_level.upper().strip()
        if lvl == "LOW":
            return "Pay anytime."
        elif lvl == "MEDIUM":
            return "Monitor exchange rate."
        elif lvl == "HIGH":
            return "Consider paying soon."
        elif lvl == "CRITICAL":
            return "Immediate payment recommended due to adverse FX movement."
        else:
            return "Pay anytime."

    def analyze_invoice_fx(self, invoice: Invoice) -> Dict[str, Any]:
        """
        Accepts the SQLAlchemy Invoice model, performs FX calculations,
        updates model attributes, and returns the analysis results dictionary.
        """
        base_currency = (settings.BASE_CURRENCY or "INR").upper().strip()
        invoice_currency = (invoice.currency or "USD").upper().strip()
        original_amount = float(invoice.total or 0.0)

        logger.info(
            f"Analyzing FX for invoice ID {invoice.id} (Currency: {invoice_currency}, Base: {base_currency})"
        )

        symbol_map = {
            "$": "USD",
            "€": "EUR",
            "£": "GBP",
            "¥": "JPY",
            "₹": "INR"
        }
        invoice_currency = symbol_map.get(invoice_currency, invoice_currency)

        # 1. Fetch current exchange rate and its API date timestamp
        try:
            current_rate, current_timestamp = self.get_exchange_rate(invoice_currency, base_currency)
        except Exception as e:
            logger.warning(
                f"Failed to fetch current exchange rate for {invoice_currency} to {base_currency}: {str(e)}. Using fallback rate."
            )
            fallback_rates = {
                "INR": {"INR": 1.0, "USD": 83.5, "EUR": 90.0, "GBP": 106.0, "JPY": 0.52, "CAD": 61.0},
                "USD": {"USD": 1.0, "EUR": 1.08, "GBP": 1.27, "JPY": 0.0066, "CAD": 0.74}
            }
            rates_for_base = fallback_rates.get(base_currency, {"USD": 1.0})
            current_rate = 1.0
            if invoice_currency in rates_for_base:
                current_rate = rates_for_base[invoice_currency]
            elif invoice_currency == base_currency:
                current_rate = 1.0
            elif base_currency in fallback_rates.get(invoice_currency, {}):
                current_rate = 1.0 / fallback_rates[invoice_currency][base_currency]
            
            current_timestamp = datetime.now(timezone.utc).replace(tzinfo=None)

        # 2. Fetch historical exchange rate on invoice date
        invoice_rate = current_rate
        try:
            invoice_date_val = invoice.invoice_date
            if invoice_date_val:
                invoice_rate, _ = self.get_exchange_rate(
                    invoice_currency, base_currency, date_val=invoice_date_val
                )
        except Exception as e:
            logger.warning(
                f"Failed to fetch historical exchange rate on date {invoice.invoice_date}: {str(e)}. "
                "Falling back to current exchange rate."
            )

        # 3. Calculations
        converted_total = round(original_amount * current_rate, 2)
        variance = self.calculate_fx_variance(invoice_rate, current_rate)
        gain_loss = self.calculate_gain_loss(original_amount, invoice_rate, current_rate)
        risk_level = self.calculate_fx_risk(variance)
        recommendation = self.generate_payment_recommendation(risk_level)

        # 4. Populate SQLAlchemy invoice model attributes
        invoice.base_currency = base_currency
        invoice.fx_rate = current_rate  # Compatible mapping for standard fx_rate
        invoice.invoice_fx_rate = invoice_rate
        invoice.current_fx_rate = current_rate
        invoice.fx_rate_timestamp = current_timestamp
        invoice.fx_variance = variance
        invoice.fx_gain_loss = gain_loss
        invoice.fx_risk_level = risk_level
        invoice.fx_recommendation = recommendation
        invoice.converted_total = converted_total

        # 5. Return payload dict
        return {
            "base_currency": base_currency,
            "invoice_currency": invoice_currency,
            "exchange_rate": current_rate,
            "invoice_fx_rate": invoice_rate,
            "current_fx_rate": current_rate,
            "converted_total": converted_total,
            "variance": variance,
            "gain_loss": gain_loss,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "timestamp": current_timestamp.isoformat(),
        }


fx_service = FXService()
