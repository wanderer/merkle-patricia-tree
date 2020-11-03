import Semaphore from 'semaphore-async-await'

interface Task {
  priority: number
  fn: Function
}

export class PrioritizedTaskExecutor {
  /** The maximum size of the pool */
  private maxPoolSize: number
  /** The current size of the pool */
  private currentPoolSize: number
  /** The task queue */
  private queue: Task[]
  /** The Lock */
  private lock: Semaphore

  /**
   * Executes tasks up to maxPoolSize at a time, other items are put in a priority queue.
   * @class PrioritizedTaskExecutor
   * @private
   * @param maxPoolSize The maximum size of the pool
   */
  constructor(maxPoolSize: number) {
    this.maxPoolSize = maxPoolSize
    this.currentPoolSize = 0
    this.queue = []
    this.lock = new Semaphore(1)
  }

  /**
   * Executes the task.
   * @private
   * @param priority The priority of the task
   * @param fn The function that accepts the callback, which must be called upon the task completion.
   */
  async execute(priority: number, fn: Function) {
    let self = this
    let runTask = () => {
      self.currentPoolSize++
      fn(async () => {
        // this callback function can be `await`ed
        self.currentPoolSize--
        if (self.queue.length > 0) {
          await self.lock.acquire() // we need the lock to be unlocked, because we are editing the queue.
          const item = self.queue.shift()
          await self.lock.signal()
          await self.execute(item!.priority, item!.fn)
        }
      })
    }
    if (this.currentPoolSize < this.maxPoolSize) {
      runTask()
    } else {
      await this.lock.wait()
      if (this.queue.length == 0) {
        this.queue.push({ priority, fn })
      } else {
        // insert the item in the queue using binary search
        let left = 0
        let right = this.queue.length
        let mid = () => {
          return Math.floor(left + (right - left) / 2)
        }
        let insert = (index: number) => {
          if (this.currentPoolSize < this.maxPoolSize) {
            runTask()
          } else {
            this.queue.splice(index, 0, { priority, fn })
          }
        }
        while (true) {
          // note that there is a special case: it could be that during sorting, a Task is finished (reducing currentPoolSize by 1), but this Task was not yet inserted
          // therefore, if we want to insert the item we explicitly check that we indeed should Queue it, if not, we execute it and do not insert it.
          let index = mid()
          let value = this.queue[index].priority
          if (value == priority) {
            // we have found the priority value and can thus insert the task at this index.
            insert(index)
            break
          }
          if (left == right) {
            // we have only one element left, this means that the items left of this index have a higher priority and the items right have a lower priority
            // we thus insert it at this index
            insert(left)
            break
          }
          if (value > priority) {
            // we know everything left of the index has a higher priority, so we do not need to consider these items anymore
            left = index + 1
          } else {
            // we know everything right of the index has a lowre priority, so we do not need to consider these items anymore
            right = index - 1
          }
          if (left > right) {
            // this could happen, for instance, if left = 0 right = 1 (the index is 0) and the item has a lower priority.
            // then right = -1, so we should insert at the left index
            insert(left)
            break
          }
        }
      }
      this.lock.signal()
    }
  }

  /**
   * Checks if the taskExecutor is finished.
   * @private
   * @returns Returns `true` if the taskExecutor is finished, otherwise returns `false`.
   */
  finished(): boolean {
    return this.currentPoolSize === 0
  }
}
