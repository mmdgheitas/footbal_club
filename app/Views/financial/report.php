<?php
/**
 * Financial Report View
 */
$year = $year ?? date('Y');
$yearlyRevenue = $yearly_revenue ?? [];
$csrfToken = $csrf_token ?? '';
?>

<div class="financial-section">
    <div class="section-header">
        <h3>Financial Report - <?= $year ?></h3>
        <form method="GET" class="year-filter">
            <input type="number" name="year" value="<?= $year ?>" min="2000" max="<?= date('Y') + 1 ?>">
            <button type="submit" class="btn btn-secondary">Filter</button>
        </form>
    </div>

    <?php if (empty($yearlyRevenue)): ?>
        <p class="empty-message">No revenue data available for this year.</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Revenue</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
                $revenueMap = [];
                foreach ($yearlyRevenue as $item) {
                    $revenueMap[$item['month']] = $item['total'];
                }
                
                for ($i = 1; $i <= 12; $i++):
                    $revenue = $revenueMap[$i] ?? 0;
                ?>
                <tr>
                    <td><?= $months[$i - 1] ?></td>
                    <td>$<?= number_format($revenue, 2) ?></td>
                </tr>
                <?php endfor; ?>
            </tbody>
        </table>

        <div class="totals">
            <h3>Total Annual Revenue: $<?= number_format(array_sum(array_values($revenueMap)), 2) ?></h3>
        </div>
    <?php endif; ?>
</div>

<style>
.financial-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.year-filter {
    display: flex;
    gap: 10px;
}

.year-filter input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 80px;
}

.totals {
    background: #f9f9f9;
    padding: 15px;
    border-radius: 4px;
    margin-top: 20px;
}

.totals h3 {
    margin: 0;
    color: #333;
}
</style>
