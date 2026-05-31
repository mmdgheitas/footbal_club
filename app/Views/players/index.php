<?php
/**
 * Players List View
 */
$players = $players ?? [];
$pagination = $pagination ?? [];
$search = $search ?? '';
$csrfToken = $csrf_token ?? '';
?>

<div class="players-section">
    <div class="section-header">
        <div>
            <a href="<?= APP_URL ?>/player/create" class="btn btn-primary">+ Add New Player</a>
        </div>
        <form method="GET" class="search-form">
            <input type="text" name="search" placeholder="Search players..." value="<?= \App\Helpers\SecurityHelper::escapeAttribute($search) ?>">
            <button type="submit" class="btn btn-secondary">Search</button>
        </form>
    </div>

    <?php if (empty($players)): ?>
        <p class="empty-message">No players found. <a href="<?= APP_URL ?>/player/create">Add one now</a></p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Position</th>
                    <th>Age Category</th>
                    <th>National ID</th>
                    <th>Status</th>
                    <th>Medical Clearance</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($players as $player): ?>
                <tr>
                    <td><?= \App\Helpers\SecurityHelper::escape($player['name']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape(PLAYER_POSITIONS[$player['position']] ?? $player['position']) ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape(AGE_CATEGORIES[$player['age_category']]['label'] ?? '') ?></td>
                    <td><?= \App\Helpers\SecurityHelper::escape($player['national_id']) ?></td>
                    <td><?= $player['status'] ? 'Active' : 'Inactive' ?></td>
                    <td><?= $player['medical_clearance'] ? '✓' : '✗' ?></td>
                    <td>
                        <a href="<?= APP_URL ?>/player/view/<?= $player['id'] ?>" class="btn btn-secondary">View</a>
                        <a href="<?= APP_URL ?>/player/edit/<?= $player['id'] ?>" class="btn btn-secondary">Edit</a>
                        <form method="POST" action="<?= APP_URL ?>/player/delete/<?= $player['id'] ?>" style="display: inline;" data-confirm="Are you sure?">
                            <input type="hidden" name="_csrf_token" value="<?= \App\Helpers\SecurityHelper::escapeAttribute($csrfToken) ?>">
                            <button type="submit" class="btn btn-danger">Delete</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <?php if (!empty($pagination)): ?>
        <div class="pagination">
            <?php if ($pagination['page'] > 1): ?>
                <a href="?page=1" class="btn">First</a>
                <a href="?page=<?= $pagination['page'] - 1 ?>" class="btn">Previous</a>
            <?php endif; ?>

            <span>Page <?= $pagination['page'] ?> of <?= $pagination['last_page'] ?></span>

            <?php if ($pagination['page'] < $pagination['last_page']): ?>
                <a href="?page=<?= $pagination['page'] + 1 ?>" class="btn">Next</a>
                <a href="?page=<?= $pagination['last_page'] ?>" class="btn">Last</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    <?php endif; ?>
</div>

<style>
.players-section {
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

.search-form {
    display: flex;
    gap: 10px;
}

.search-form input {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 300px;
}

.empty-message {
    text-align: center;
    color: #999;
    padding: 40px;
}

.pagination {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
}

.pagination .btn {
    padding: 8px 12px;
}
</style>
